import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from datetime import timedelta

from database import db
from routes.auth import auth_bp
from routes.reports import reports_bp
from routes.admin import admin_bp
from routes.audit import audit_bp
from routes.users import users_bp

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Configuration
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    server = os.getenv("DB_SERVER", "localhost")
    port = os.getenv("DB_PORT", "1433")
    database = os.getenv("DB_NAME", "jasper_reports_db")
    user = os.getenv("DB_USER", "sa")
    password = os.getenv("DB_PASSWORD", "")

    connection_string = (
        f"mssql+pyodbc://{user}:{password}@{server},{port}/{database}"
        f"?driver={driver.replace(' ', '+')}&TrustServerCertificate=yes"
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = connection_string
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600)))
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800)))

    # Extensions
    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "http://localhost:5173")}})

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    # Create tables
    with app.app_context():
        db.create_all()
        seed_default_admin()

    return app


def seed_default_admin():
    from models import User, Role
    import bcrypt

    if not Role.query.first():
        admin_role = Role(name="admin", description="Full system access")
        user_role = Role(name="user", description="Standard user access")
        db.session.add_all([admin_role, user_role])
        db.session.commit()

    if not User.query.filter_by(email="admin@jasper.com").first():
        from models import Role
        admin_role = Role.query.filter_by(name="admin").first()
        hashed = bcrypt.hashpw("Admin@123".encode(), bcrypt.gensalt()).decode()
        admin = User(
            username="admin",
            email="admin@jasper.com",
            password_hash=hashed,
            role_id=admin_role.id,
            is_active=True
        )
        db.session.add(admin)
        db.session.commit()


if __name__ == "__main__":
    app = create_app()
    app.run(debug=os.getenv("DEBUG", "False") == "True", port=5000)
