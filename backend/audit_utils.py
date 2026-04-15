import json
from datetime import datetime, timezone
from flask import request
from database import db
from models import AuditLog


def log_action(
    admin_user_id: int,
    action_type: str,
    entity_type: str,
    entity_id: int = None,
    entity_name: str = None,
    changes_before: dict = None,
    changes_after: dict = None,
    description: str = None,
):
    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
    user_agent = request.headers.get("User-Agent", "")[:500]

    log = AuditLog(
        admin_user_id=admin_user_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        changes_before=json.dumps(changes_before, default=str) if changes_before else None,
        changes_after=json.dumps(changes_after, default=str) if changes_after else None,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.now(timezone.utc),
        description=description,
    )
    db.session.add(log)
    db.session.commit()
    return log


class ActionType:
    # Auth
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Reports
    CREATE_REPORT = "CREATE_REPORT"
    UPDATE_REPORT = "UPDATE_REPORT"
    DELETE_REPORT = "DELETE_REPORT"
    TOGGLE_VISIBILITY = "TOGGLE_VISIBILITY"
    TOGGLE_PUBLIC = "TOGGLE_PUBLIC"

    # Parameters
    ADD_PARAMETER = "ADD_PARAMETER"
    UPDATE_PARAMETER = "UPDATE_PARAMETER"
    DELETE_PARAMETER = "DELETE_PARAMETER"

    # Users
    CREATE_USER = "CREATE_USER"
    UPDATE_USER = "UPDATE_USER"
    DEACTIVATE_USER = "DEACTIVATE_USER"
    ACTIVATE_USER = "ACTIVATE_USER"
    CHANGE_ROLE = "CHANGE_ROLE"

    # Access (user-level)
    GRANT_ACCESS = "GRANT_ACCESS"
    REVOKE_ACCESS = "REVOKE_ACCESS"

    # Access (role-level)
    GRANT_ROLE_ACCESS = "GRANT_ROLE_ACCESS"
    REVOKE_ROLE_ACCESS = "REVOKE_ROLE_ACCESS"

    # Roles
    CREATE_ROLE = "CREATE_ROLE"
    UPDATE_ROLE = "UPDATE_ROLE"
    DELETE_ROLE = "DELETE_ROLE"


class EntityType:
    REPORT = "Rapport"
    PARAMETER = "Paramètre"
    USER = "Utilisateur"
    ACCESS = "Accès"
    ROLE = "Rôle"
    AUTH = "Auth"
