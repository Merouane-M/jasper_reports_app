from datetime import datetime, timezone
from database import db


class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    is_system = db.Column(db.Boolean, default=False)  # True for admin/user built-ins
    users = db.relationship("User", back_populates="role")
    role_report_access = db.relationship("RoleReportAccess", back_populates="role", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_system": self.is_system,
        }


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)

    role = db.relationship("Role", back_populates="users")
    report_access = db.relationship(
        "UserReportAccess",
        back_populates="user",
        foreign_keys="UserReportAccess.user_id"
    )
    granted_reports = db.relationship(
        "UserReportAccess",
        foreign_keys="UserReportAccess.granted_by"
    )
    audit_logs = db.relationship("AuditLog", back_populates="admin_user")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role.to_dict() if self.role else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    jasper_url = db.Column(db.String(500), nullable=False)
    http_method = db.Column(db.String(10), default="GET")
    is_public = db.Column(db.Boolean, default=False)
    is_visible = db.Column(db.Boolean, default=True)
    is_deleted = db.Column(db.Boolean, default=False)
    ignore_pagination = db.Column(db.Boolean, default=False)  # NEW
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    parameters = db.relationship("ReportParameter", back_populates="report", cascade="all, delete-orphan")
    user_access = db.relationship("UserReportAccess", back_populates="report", cascade="all, delete-orphan")
    role_access = db.relationship("RoleReportAccess", back_populates="report", cascade="all, delete-orphan")

    def to_dict(self, include_params=False):
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "jasper_url": self.jasper_url,
            "http_method": self.http_method,
            "is_public": self.is_public,
            "is_visible": self.is_visible,
            "ignore_pagination": self.ignore_pagination,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_params:
            data["parameters"] = [p.to_dict() for p in self.parameters]
        return data


class ReportParameter(db.Model):
    __tablename__ = "report_parameters"
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    label = db.Column(db.String(255))
    # text | number | date | dropdown | multiselect
    param_type = db.Column(db.String(50), nullable=False)
    is_required = db.Column(db.Boolean, default=False)
    default_value = db.Column(db.String(500))
    dropdown_options = db.Column(db.Text)   # JSON array of strings
    display_order = db.Column(db.Integer, default=0)

    report = db.relationship("Report", back_populates="parameters")

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "report_id": self.report_id,
            "name": self.name,
            "label": self.label or self.name,
            "param_type": self.param_type,
            "is_required": self.is_required,
            "default_value": self.default_value,
            "dropdown_options": json.loads(self.dropdown_options) if self.dropdown_options else [],
            "display_order": self.display_order,
        }


class UserReportAccess(db.Model):
    __tablename__ = "user_report_access"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    granted_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    granted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", foreign_keys=[user_id], back_populates="report_access")
    report = db.relationship("Report", back_populates="user_access")
    granted_by_user = db.relationship("User", foreign_keys=[granted_by])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "report_id": self.report_id,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
        }


class RoleReportAccess(db.Model):
    """Role-level report access — all users with this role can see the report."""
    __tablename__ = "role_report_access"
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    granted_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    granted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    role = db.relationship("Role", back_populates="role_report_access")
    report = db.relationship("Report", back_populates="role_access")

    def to_dict(self):
        return {
            "id": self.id,
            "role_id": self.role_id,
            "report_id": self.report_id,
            "role_name": self.role.name if self.role else None,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    __table_args__ = (
        db.Index("ix_audit_logs_timestamp", "timestamp"),
        db.Index("ix_audit_logs_admin_user_id", "admin_user_id"),
        db.Index("ix_audit_logs_action_type", "action_type"),
        db.Index("ix_audit_logs_entity_type", "entity_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action_type = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(100), nullable=False)
    entity_id = db.Column(db.Integer)
    entity_name = db.Column(db.String(255))
    changes_before = db.Column(db.Text)  # JSON
    changes_after = db.Column(db.Text)   # JSON
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    description = db.Column(db.Text)

    admin_user = db.relationship("User", back_populates="audit_logs")

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "admin_user_id": self.admin_user_id,
            "admin_username": self.admin_user.username if self.admin_user else "inconnu",
            "action_type": self.action_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "changes_before": json.loads(self.changes_before) if self.changes_before else None,
            "changes_after": json.loads(self.changes_after) if self.changes_after else None,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "description": self.description,
        }
