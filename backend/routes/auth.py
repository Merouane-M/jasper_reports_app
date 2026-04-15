from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from datetime import datetime, timezone
import bcrypt

from database import db
from models import User
from audit_utils import log_action, ActionType, EntityType

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        if user:
            log_action(
                admin_user_id=user.id,
                action_type=ActionType.LOGIN_FAILED,
                entity_type=EntityType.AUTH,
                entity_id=user.id,
                entity_name=user.username,
                description=f"Tentative de connexion échouée pour {email}",
            )
        return jsonify({"error": "Identifiants invalides"}), 401

    if not user.is_active:
        return jsonify({"error": "Ce compte est désactivé"}), 403

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    log_action(
        admin_user_id=user.id,
        action_type=ActionType.LOGIN_SUCCESS,
        entity_type=EntityType.AUTH,
        entity_id=user.id,
        entity_name=user.username,
        description=f"Connexion réussie pour {email}",
    )

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Any authenticated user can change their own password."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data = request.get_json()
    current = data.get("current_password", "")
    new_pwd = data.get("new_password", "")

    if not bcrypt.checkpw(current.encode(), user.password_hash.encode()):
        return jsonify({"error": "Mot de passe actuel incorrect"}), 400

    if len(new_pwd) < 6:
        return jsonify({"error": "Le nouveau mot de passe doit contenir au moins 6 caractères"}), 400

    user.password_hash = bcrypt.hashpw(new_pwd.encode(), bcrypt.gensalt()).decode()
    db.session.commit()

    log_action(
        admin_user_id=user_id,
        action_type=ActionType.PASSWORD_CHANGED,
        entity_type=EntityType.USER,
        entity_id=user_id,
        entity_name=user.username,
        description=f"Mot de passe modifié par {user.username}",
    )

    return jsonify({"message": "Mot de passe mis à jour avec succès"}), 200
