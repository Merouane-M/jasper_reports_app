import os
import requests
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import User, Report, UserReportAccess, RoleReportAccess

reports_bp = Blueprint("reports", __name__)


def get_current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def user_can_access(user: User, report: Report) -> bool:
    if user.role.name == "admin":
        return True
    if report.is_public:
        return True
    # User-level access
    if UserReportAccess.query.filter_by(user_id=user.id, report_id=report.id).first():
        return True
    # Role-level access
    if RoleReportAccess.query.filter_by(role_id=user.role_id, report_id=report.id).first():
        return True
    return False


@reports_bp.route("/", methods=["GET"])
@jwt_required()
def list_reports():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    if user.role.name == "admin":
        reports = Report.query.filter_by(is_deleted=False, is_visible=True).all()
    else:
        all_reports = Report.query.filter_by(is_deleted=False, is_visible=True).all()
        reports = [r for r in all_reports if user_can_access(user, r)]

    return jsonify([r.to_dict(include_params=True) for r in reports]), 200


@reports_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
def get_report(report_id):
    user = get_current_user()
    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404
    if not user_can_access(user, report):
        return jsonify({"error": "Accès refusé"}), 403
    return jsonify(report.to_dict(include_params=True)), 200


@reports_bp.route("/<int:report_id>/execute", methods=["POST"])
@jwt_required()
def execute_report(report_id):
    user = get_current_user()
    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Rapport introuvable"}), 404
    if not user_can_access(user, report):
        return jsonify({"error": "Accès refusé"}), 403

    body = request.get_json() or {}
    output_format = body.pop("output_format", "pdf").upper()

    # Build query params — multiselect values are lists → repeated keys for Jasper ArrayList
    # Jasper expects: ?param=val1&param=val2  to fill an ArrayList parameter
    query_params: list[tuple[str, str]] = []
    for key, value in body.items():
        if isinstance(value, list):
            # multiselect → repeated key pattern
            for item in value:
                query_params.append((key, item))
        else:
            query_params.append((key, value))

    jasper_base = os.getenv("JASPER_BASE_URL")
    jasper_user = os.getenv("JASPER_USERNAME")
    jasper_pass = os.getenv("JASPER_PASSWORD")
    # ignore_pagination support

    if report.ignore_pagination and output_format == body.pop("output_format", "xlsx").upper():
        query_params.append(("ignorePagination", "true"))
        url = f"{jasper_base}/rest_v2/reports{report.jasper_url}.{output_format}"
    
    else : 
        url = f"{jasper_base}/rest_v2/reports{report.jasper_url}.{output_format}"

    try:
        response = requests.request(
            method=report.http_method,
            url=url,
            params=query_params,
            auth=(jasper_user, jasper_pass),
            timeout=120,
            stream=True,
        )
        response.raise_for_status()

        mime_map = {
            "PDF":  "application/pdf",
            "XLSX": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "CSV":  "text/csv",
            "HTML": "text/html",
            "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        mime = mime_map.get(output_format, "application/octet-stream")
        ext = output_format.lower()

        return Response(
            response.content,
            status=200,
            mimetype=mime,
            headers={"Content-Disposition": f"attachment; filename=rapport_{report_id}.{ext}"},
        )
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Impossible de se connecter au serveur JasperReports"}), 502
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Erreur JasperReports : {str(e)}"}), e.response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
