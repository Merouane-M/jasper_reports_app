import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import bcrypt

from database import db
from models import User, Report, ReportParameter, UserReportAccess, Role
from audit_utils import log_action, ActionType, EntityType

admin_bp = Blueprint("admin", __name__)


def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role.name != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


# ──────────────────────────────────────────────
# REPORT MANAGEMENT
# ──────────────────────────────────────────────

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
        created_by=admin.id,
    )
    db.session.add(report)
    db.session.flush()

    # Add parameters
    for i, p in enumerate(data.get("parameters", [])):
        param = ReportParameter(
            report_id=report.id,
            name=p["name"],
            label=p.get("label", p["name"]),
            param_type=p["param_type"],
            is_required=p.get("is_required", False),
            default_value=p.get("default_value"),
            dropdown_options=json.dumps(p.get("dropdown_options", [])),
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
        description=f"Created report '{report.name}'",
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
        return jsonify({"error": "Report not found"}), 404

    before = report.to_dict(include_params=True)
    data = request.get_json()

    report.name = data.get("name", report.name)
    report.description = data.get("description", report.description)
    report.jasper_url = data.get("jasper_url", report.jasper_url)
    report.http_method = data.get("http_method", report.http_method)
    report.is_public = data.get("is_public", report.is_public)
    report.is_visible = data.get("is_visible", report.is_visible)
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
                dropdown_options=json.dumps(p.get("dropdown_options", [])),
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
        description=f"Updated report '{report.name}'",
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
        return jsonify({"error": "Report not found"}), 404

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
        description=f"Soft-deleted report '{report.name}'",
    )

    return jsonify({"message": "Report deleted"}), 200


@admin_bp.route("/reports/<int:report_id>/toggle-visibility", methods=["PATCH"])
@jwt_required()
def toggle_visibility(report_id):
    admin, err = require_admin()
    if err:
        return err

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404

    report.is_visible = not report.is_visible
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.TOGGLE_VISIBILITY,
        entity_type=EntityType.REPORT,
        entity_id=report.id,
        entity_name=report.name,
        changes_after={"is_visible": report.is_visible},
        description=f"Toggled visibility of '{report.name}' to {report.is_visible}",
    )

    return jsonify({"is_visible": report.is_visible}), 200


# ──────────────────────────────────────────────
# ACCESS CONTROL
# ──────────────────────────────────────────────

@admin_bp.route("/reports/<int:report_id>/access", methods=["POST"])
@jwt_required()
def grant_access(report_id):
    admin, err = require_admin()
    if err:
        return err

    data = request.get_json()
    user_id = data.get("user_id")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404

    existing = UserReportAccess.query.filter_by(user_id=user_id, report_id=report_id).first()
    if existing:
        return jsonify({"message": "Access already granted"}), 200

    access = UserReportAccess(user_id=user_id, report_id=report_id, granted_by=admin.id)
    db.session.add(access)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.GRANT_ACCESS,
        entity_type=EntityType.ACCESS,
        entity_id=report_id,
        entity_name=f"{user.username} -> {report.name}",
        description=f"Granted {user.username} access to report '{report.name}'",
    )

    return jsonify({"message": "Access granted"}), 201


@admin_bp.route("/reports/<int:report_id>/access/<int:user_id>", methods=["DELETE"])
@jwt_required()
def revoke_access(report_id, user_id):
    admin, err = require_admin()
    if err:
        return err

    access = UserReportAccess.query.filter_by(user_id=user_id, report_id=report_id).first()
    if not access:
        return jsonify({"error": "Access not found"}), 404

    user = User.query.get(user_id)
    report = Report.query.get(report_id)

    db.session.delete(access)
    db.session.commit()

    log_action(
        admin_user_id=admin.id,
        action_type=ActionType.REVOKE_ACCESS,
        entity_type=EntityType.ACCESS,
        entity_id=report_id,
        entity_name=f"{user.username if user else user_id} -> {report.name if report else report_id}",
        description=f"Revoked access to report '{report.name if report else report_id}'",
    )

    return jsonify({"message": "Access revoked"}), 200


@admin_bp.route("/reports/<int:report_id>/access", methods=["GET"])
@jwt_required()
def get_report_access(report_id):
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
