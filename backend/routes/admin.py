import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone

from database import db
from models import User, Report, ReportParameter, UserReportAccess, RoleReportAccess, Role
from audit_utils import log_action, ActionType, EntityType

admin_bp = Blueprint("admin", __name__)


def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role.name != "admin":
        return None, (jsonify({"error": "Accès administrateur requis"}), 403)
    return user, None


# ─────────────────────────────────────────────
# REPORT MANAGEMENT
# ─────────────────────────────────────────────

@admin_bp.route("/reports", methods=["GET"])
@jwt_required()
def list_all_reports():
    admin, err = require_admin()
    if err:
        return err
    reports = Report.query.filter_by(is_deleted=False).all()
    return jsonify([r.to_dict(include_params=True) for r in reports]), 200


@admin_bp.route("/reports", methods=["POST"])
@jwt_required()
def create_report():
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    report = Report(
        name=data["name"],
        description=data.get("description"),
        jasper_url=data["jasper_url"],
        http_method=data.get("http_method", "GET"),
        is_public=data.get("is_public", False),
        is_visible=data.get("is_visible", True),
        ignore_pagination=data.get("ignore_pagination", False),
        created_by=admin.id,
    )
    db.session.add(report)
    db.session.flush()

    for i, p in enumerate(data.get("parameters", [])):
        param = ReportParameter(
            report_id=report.id,
            name=p["name"],
            label=p.get("label", p["name"]),
            param_type=p["param_type"],
            is_required=p.get("is_required", False),
            default_value=p.get("default_value"),
            dropdown_options=json.dumps(p.get("dropdown_options", []), ensure_ascii=False),
            display_order=i,
        )
        db.session.add(param)

    db.session.commit()
    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.CREATE_REPORT,
        entity_type=EntityType.REPORT,
        entity_id=report.id,
        entity_name=report.name,
        changes_after=report.to_dict(include_params=True),
        description=f"Rapport « {report.name} » créé",
    )
    return jsonify(report.to_dict(include_params=True)), 201


@admin_bp.route("/reports/<int:report_id>", methods=["PUT"])
@jwt_required()
def update_report(report_id):
    admin, err = require_admin()
    if err:
        return err

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404

    before = report.to_dict(include_params=True)
    data = request.get_json()

    report.name = data.get("name", report.name)
    report.description = data.get("description", report.description)
    report.jasper_url = data.get("jasper_url", report.jasper_url)
    report.http_method = data.get("http_method", report.http_method)
    report.is_public = data.get("is_public", report.is_public)
    report.is_visible = data.get("is_visible", report.is_visible)
    report.ignore_pagination = data.get("ignore_pagination", report.ignore_pagination)
    report.updated_at = datetime.now(timezone.utc)

    if "parameters" in data:
        ReportParameter.query.filter_by(report_id=report.id).delete()
        for i, p in enumerate(data["parameters"]):
            param = ReportParameter(
                report_id=report.id,
                name=p["name"],
                label=p.get("label", p["name"]),
                param_type=p["param_type"],
                is_required=p.get("is_required", False),
                default_value=p.get("default_value"),
                dropdown_options=json.dumps(p.get("dropdown_options", []), ensure_ascii=False),
                display_order=i,
            )
            db.session.add(param)

    db.session.commit()
    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.UPDATE_REPORT,
        entity_type=EntityType.REPORT,
        entity_id=report.id,
        entity_name=report.name,
        changes_before=before,
        changes_after=report.to_dict(include_params=True),
        description=f"Rapport « {report.name} » modifié",
    )
    return jsonify(report.to_dict(include_params=True)), 200


@admin_bp.route("/reports/<int:report_id>", methods=["DELETE"])
@jwt_required()
def delete_report(report_id):
    admin, err = require_admin()
    if err:
        return err

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404

    before = report.to_dict()
    report.is_deleted = True
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.DELETE_REPORT,
        entity_type=EntityType.REPORT,
        entity_id=report.id,
        entity_name=report.name,
        changes_before=before,
        description=f"Rapport « {report.name} » supprimé",
    )
    return jsonify({"message": "Rapport supprimé"}), 200


@admin_bp.route("/reports/<int:report_id>/toggle-visibility", methods=["PATCH"])
@jwt_required()
def toggle_visibility(report_id):
    admin, err = require_admin()
    if err:
        return err

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404

    report.is_visible = not report.is_visible
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.TOGGLE_VISIBILITY,
        entity_type=EntityType.REPORT,
        entity_id=report.id,
        entity_name=report.name,
        changes_after={"is_visible": report.is_visible},
        description=f"Visibilité du rapport « {report.name} » → {report.is_visible}",
    )
    return jsonify({"is_visible": report.is_visible}), 200


# ─────────────────────────────────────────────
# USER-LEVEL ACCESS CONTROL
# ─────────────────────────────────────────────

@admin_bp.route("/reports/<int:report_id>/access/users", methods=["GET"])
@jwt_required()
def get_user_access(report_id):
    admin, err = require_admin()
    if err:
        return err

    accesses = UserReportAccess.query.filter_by(report_id=report_id).all()
    result = []
    for a in accesses:
        result.append({
            **a.to_dict(),
            "username": a.user.username if a.user else None,
            "email": a.user.email if a.user else None,
        })
    return jsonify(result), 200


@admin_bp.route("/reports/<int:report_id>/access/users", methods=["POST"])
@jwt_required()
def grant_user_access(report_id):
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    user_id = data.get("user_id")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404

    if not UserReportAccess.query.filter_by(user_id=user_id, report_id=report_id).first():
        access = UserReportAccess(user_id=user_id, report_id=report_id, granted_by=admin.id)
        db.session.add(access)
        db.session.commit()
        log_action(
            admin_user_id=admin.id,
            action_type=ActionType.GRANT_ACCESS,
            entity_type=EntityType.ACCESS,
            entity_id=report_id,
            entity_name=f"{user.username} → {report.name}",
            description=f"Accès accordé à {user.username} pour « {report.name} »",
        )

    return jsonify({"message": "Accès accordé"}), 201


@admin_bp.route("/reports/<int:report_id>/access/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def revoke_user_access(report_id, user_id):
    admin, err = require_admin()
    if err:
        return err

    access = UserReportAccess.query.filter_by(user_id=user_id, report_id=report_id).first()
    if not access:
        return jsonify({"error": "Accès introuvable"}), 404

    user = User.query.get(user_id)
    report = Report.query.get(report_id)
    db.session.delete(access)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.REVOKE_ACCESS,
        entity_type=EntityType.ACCESS,
        entity_id=report_id,
        entity_name=f"{user.username if user else user_id} → {report.name if report else report_id}",
        description=f"Accès révoqué pour « {report.name if report else report_id} »",
    )
    return jsonify({"message": "Accès révoqué"}), 200


# ─────────────────────────────────────────────
# ROLE-LEVEL ACCESS CONTROL
# ─────────────────────────────────────────────

@admin_bp.route("/reports/<int:report_id>/access/roles", methods=["GET"])
@jwt_required()
def get_role_access(report_id):
    admin, err = require_admin()
    if err:
        return err

    accesses = RoleReportAccess.query.filter_by(report_id=report_id).all()
    return jsonify([a.to_dict() for a in accesses]), 200


@admin_bp.route("/reports/<int:report_id>/access/roles", methods=["POST"])
@jwt_required()
def grant_role_access(report_id):
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    role_id = data.get("role_id")
    role = Role.query.get(role_id)
    if not role:
        return jsonify({"error": "Rôle introuvable"}), 404

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404

    if not RoleReportAccess.query.filter_by(role_id=role_id, report_id=report_id).first():
        access = RoleReportAccess(role_id=role_id, report_id=report_id, granted_by=admin.id)
        db.session.add(access)
        db.session.commit()
        log_action(
            admin_user_id=admin.id,
            action_type=ActionType.GRANT_ROLE_ACCESS,
            entity_type=EntityType.ACCESS,
            entity_id=report_id,
            entity_name=f"Rôle {role.name} → {report.name}",
            description=f"Accès accordé au rôle « {role.name} » pour « {report.name} »",
        )

    return jsonify({"message": "Accès accordé au rôle"}), 201


@admin_bp.route("/reports/<int:report_id>/access/roles/<int:role_id>", methods=["DELETE"])
@jwt_required()
def revoke_role_access(report_id, role_id):
    admin, err = require_admin()
    if err:
        return err

    access = RoleReportAccess.query.filter_by(role_id=role_id, report_id=report_id).first()
    if not access:
        return jsonify({"error": "Accès introuvable"}), 404

    role = Role.query.get(role_id)
    report = Report.query.get(report_id)
    db.session.delete(access)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.REVOKE_ROLE_ACCESS,
        entity_type=EntityType.ACCESS,
        entity_id=report_id,
        entity_name=f"Rôle {role.name if role else role_id} → {report.name if report else report_id}",
        description=f"Accès révoqué pour le rôle « {role.name if role else role_id} »",
    )
    return jsonify({"message": "Accès du rôle révoqué"}), 200
