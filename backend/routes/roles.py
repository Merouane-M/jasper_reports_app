from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import User, Role
from audit_utils import log_action, ActionType, EntityType

roles_bp = Blueprint("roles", __name__)


def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role.name != "admin":
        return None, (jsonify({"error": "Accès administrateur requis"}), 403)
    return user, None


@roles_bp.route("/", methods=["GET"])
@jwt_required()
def list_roles():
    roles = Role.query.all()
    return jsonify([r.to_dict() for r in roles]), 200


@roles_bp.route("/", methods=["POST"])
@jwt_required()
def create_role():
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Le nom du rôle est requis"}), 400

    if Role.query.filter_by(name=name).first():
        return jsonify({"error": "Un rôle avec ce nom existe déjà"}), 409

    role = Role(name=name, description=data.get("description", ""), is_system=False)
    db.session.add(role)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.CREATE_ROLE,
        entity_type=EntityType.ROLE,
        entity_id=role.id,
        entity_name=role.name,
        changes_after=role.to_dict(),
        description=f"Rôle « {role.name} » créé",
    )
    return jsonify(role.to_dict()), 201


@roles_bp.route("/<int:role_id>", methods=["PUT"])
@jwt_required()
def update_role(role_id):
    admin, err = require_admin()
    if err:
        return err

    role = Role.query.get(role_id)
    if not role:
        return jsonify({"error": "Rôle introuvable"}), 404
    if role.is_system:
        return jsonify({"error": "Les rôles système ne peuvent pas être modifiés"}), 403

    before = role.to_dict()
    data = request.get_json()
    role.name = data.get("name", role.name)
    role.description = data.get("description", role.description)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.UPDATE_ROLE,
        entity_type=EntityType.ROLE,
        entity_id=role.id,
        entity_name=role.name,
        changes_before=before,
        changes_after=role.to_dict(),
        description=f"Rôle « {role.name} » modifié",
    )
    return jsonify(role.to_dict()), 200


@roles_bp.route("/<int:role_id>", methods=["DELETE"])
@jwt_required()
def delete_role(role_id):
    admin, err = require_admin()
    if err:
        return err

    role = Role.query.get(role_id)
    if not role:
        return jsonify({"error": "Rôle introuvable"}), 404
    if role.is_system:
        return jsonify({"error": "Les rôles système ne peuvent pas être supprimés"}), 403
    if role.users:
        return jsonify({"error": "Impossible de supprimer un rôle assigné à des utilisateurs"}), 409

    before = role.to_dict()
    db.session.delete(role)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.DELETE_ROLE,
        entity_type=EntityType.ROLE,
        entity_id=role_id,
        entity_name=before["name"],
        changes_before=before,
        description=f"Rôle « {before['name']} » supprimé",
    )
    return jsonify({"message": "Rôle supprimé"}), 200
