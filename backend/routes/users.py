import bcrypt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import User, Role
from audit_utils import log_action, ActionType, EntityType

users_bp = Blueprint("users", __name__)


def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role.name != "admin":
        return None, (jsonify({"error": "Accès administrateur requis"}), 403)
    return user, None


@users_bp.route("/", methods=["GET"])
@jwt_required()
def list_users():
    admin, err = require_admin()
    if err:
        return err
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
def create_user():
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    if User.query.filter(
        (User.email == data["email"]) | (User.username == data["username"])
    ).first():
        return jsonify({"error": "Nom d'utilisateur ou e-mail déjà utilisé"}), 409

    role = Role.query.get(data.get("role_id"))
    if not role:
        return jsonify({"error": "Rôle introuvable"}), 404

    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hashed,
        role_id=role.id,
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.CREATE_USER,
        entity_type=EntityType.USER,
        entity_id=user.id,
        entity_name=user.username,
        changes_after=user.to_dict(),
        description=f"Utilisateur « {user.username} » créé",
    )
    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    admin, err = require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    before = user.to_dict()
    data = request.get_json()

    if "username" in data:
        user.username = data["username"]
    if "email" in data:
        user.email = data["email"]
    if "role_id" in data:
        role = Role.query.get(data["role_id"])
        if role and role.id != user.role_id:
            old_role = user.role.name
            user.role_id = role.id
            log_action(
                admin_user_id=admin.id,
                action_type=ActionType.CHANGE_ROLE,
                entity_type=EntityType.USER,
                entity_id=user.id,
                entity_name=user.username,
                changes_before={"role": old_role},
                changes_after={"role": role.name},
                description=f"Rôle de « {user.username} » modifié : {old_role} → {role.name}",
            )
    # Admin can reset password for a user
    if "password" in data and data["password"]:
        user.password_hash = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()

    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.UPDATE_USER,
        entity_type=EntityType.USER,
        entity_id=user.id,
        entity_name=user.username,
        changes_before=before,
        changes_after=user.to_dict(),
        description=f"Utilisateur « {user.username} » modifié",
    )
    return jsonify(user.to_dict()), 200


@users_bp.route("/<int:user_id>/toggle-status", methods=["PATCH"])
@jwt_required()
def toggle_user_status(user_id):
    admin, err = require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    user.is_active = not user.is_active
    db.session.commit()

    action = ActionType.ACTIVATE_USER if user.is_active else ActionType.DEACTIVATE_USER
    log_action(
        admin_user_id=admin.id,
        action_type=action,
        entity_type=EntityType.USER,
        entity_id=user.id,
        entity_name=user.username,
        changes_after={"is_active": user.is_active},
        description=f"Utilisateur « {user.username} » {'activé' if user.is_active else 'désactivé'}",
    )
    return jsonify(user.to_dict()), 200
