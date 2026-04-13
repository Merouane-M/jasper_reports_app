import os
import requests
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import User, Report, UserReportAccess

reports_bp = Blueprint("reports", __name__)


def get_current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


@reports_bp.route("/", methods=["GET"])
@jwt_required()
def list_reports():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role.name == "admin":
        reports = Report.query.filter_by(is_deleted=False, is_visible=True).all()
    else:
        # Public reports + reports user has access to
        public_reports = Report.query.filter_by(is_deleted=False, is_visible=True, is_public=True).all()
        access_ids = [a.report_id for a in UserReportAccess.query.filter_by(user_id=user.id).all()]
        private_reports = Report.query.filter(
            Report.id.in_(access_ids),
            Report.is_deleted == False,
            Report.is_visible == True
        ).all()
        seen = set()
        reports = []
        for r in public_reports + private_reports:
            if r.id not in seen:
                seen.add(r.id)
                reports.append(r)

    return jsonify([r.to_dict(include_params=True) for r in reports]), 200


@reports_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
def get_report(report_id):
    user = get_current_user()
    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404

    if user.role.name != "admin":
        has_access = report.is_public or UserReportAccess.query.filter_by(
            user_id=user.id, report_id=report_id
        ).first()
        if not has_access:
            return jsonify({"error": "Access denied"}), 403

    return jsonify(report.to_dict(include_params=True)), 200


@reports_bp.route("/<int:report_id>/execute", methods=["POST"])
@jwt_required()
def execute_report(report_id):
    user = get_current_user()
    report = Report.query.filter_by(id=report_id, is_deleted=False).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404

    if user.role.name != "admin":
        has_access = report.is_public or UserReportAccess.query.filter_by(
            user_id=user.id, report_id=report_id
        ).first()
        if not has_access:
            return jsonify({"error": "Access denied"}), 403

    params = request.get_json() or {}
    output_format = params.pop("output_format", "pdf").upper()

    jasper_base = os.getenv("JASPER_BASE_URL", "http://172:8080/jasperserver")
    jasper_user = os.getenv("JASPER_USERNAME", "jasperadmin")
    jasper_pass = os.getenv("JASPER_PASSWORD", "jasperadmin")

    url = f"{jasper_base}/rest_v2/reports{report.jasper_url}.{output_format}"

    try:
        response = requests.request(
            method=report.http_method,
            url=url,
            params=params,
            auth=(jasper_user, jasper_pass),
            timeout=60,
            stream=True
        )
        response.raise_for_status()

        content_type_map = {
            "pdf": "application/pdf",
            "XLSX": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "CSV": "text/csv",
            "HTML": "text/html",
            "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        content_type = content_type_map.get(output_format, "application/octet-stream")

        return Response(
            response.content,
            status=200,
            mimetype=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.{output_format.lower()}"
            }
        )
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to JasperReports Server"}), 502
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"JasperReports error: {str(e)}"}), e.response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
