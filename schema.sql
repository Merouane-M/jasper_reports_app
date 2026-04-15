-- ============================================================
-- JasperPortal v2 — Schéma MS SQL Server
-- ============================================================
USE master;
GO
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='jasper_reports_db')
    CREATE DATABASE jasper_reports_db;
GO
USE jasper_reports_db;
GO

-- ── ROLES ──────────────────────────────────────
IF OBJECT_ID('dbo.roles','U') IS NULL
CREATE TABLE roles (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(50)  NOT NULL UNIQUE,
    description NVARCHAR(255),
    is_system   BIT           NOT NULL DEFAULT 0
);
GO

-- ── USERS ──────────────────────────────────────
IF OBJECT_ID('dbo.users','U') IS NULL
CREATE TABLE users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(100) NOT NULL UNIQUE,
    email         NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role_id       INT           NOT NULL REFERENCES roles(id),
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    last_login    DATETIME2
);
GO
CREATE INDEX IX_users_email   ON users(email);
CREATE INDEX IX_users_role_id ON users(role_id);
GO

-- ── REPORTS ────────────────────────────────────
IF OBJECT_ID('dbo.reports','U') IS NULL
CREATE TABLE reports (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    name               NVARCHAR(255) NOT NULL,
    description        NVARCHAR(MAX),
    jasper_url         NVARCHAR(500) NOT NULL,
    http_method        NVARCHAR(10)  NOT NULL DEFAULT 'GET',
    is_public          BIT           NOT NULL DEFAULT 0,
    is_visible         BIT           NOT NULL DEFAULT 1,
    is_deleted         BIT           NOT NULL DEFAULT 0,
    ignore_pagination  BIT           NOT NULL DEFAULT 0,
    created_by         INT REFERENCES users(id),
    created_at         DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at         DATETIME2
);
GO
CREATE INDEX IX_reports_deleted ON reports(is_deleted);
CREATE INDEX IX_reports_visible ON reports(is_visible);
GO

-- ── REPORT PARAMETERS ─────────────────────────
IF OBJECT_ID('dbo.report_parameters','U') IS NULL
CREATE TABLE report_parameters (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    report_id        INT           NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    name             NVARCHAR(100) NOT NULL,
    label            NVARCHAR(255),
    param_type       NVARCHAR(50)  NOT NULL,  -- text|number|date|dropdown|multiselect
    is_required      BIT           NOT NULL DEFAULT 0,
    default_value    NVARCHAR(500),
    dropdown_options NVARCHAR(MAX),            -- JSON array
    display_order    INT           NOT NULL DEFAULT 0
);
GO

-- ── USER REPORT ACCESS ────────────────────────
IF OBJECT_ID('dbo.user_report_access','U') IS NULL
CREATE TABLE user_report_access (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id   INT       NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    granted_by  INT REFERENCES users(id),
    granted_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_user_report UNIQUE (user_id, report_id)
);
GO

-- ── ROLE REPORT ACCESS ────────────────────────
IF OBJECT_ID('dbo.role_report_access','U') IS NULL
CREATE TABLE role_report_access (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    role_id     INT       NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    report_id   INT       NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    granted_by  INT REFERENCES users(id),
    granted_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_role_report UNIQUE (role_id, report_id)
);
GO

-- ── AUDIT LOGS (immuables) ────────────────────
IF OBJECT_ID('dbo.audit_logs','U') IS NULL
CREATE TABLE audit_logs (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    admin_user_id   INT           NOT NULL REFERENCES users(id),
    action_type     NVARCHAR(100) NOT NULL,
    entity_type     NVARCHAR(100) NOT NULL,
    entity_id       INT,
    entity_name     NVARCHAR(255),
    changes_before  NVARCHAR(MAX),
    changes_after   NVARCHAR(MAX),
    ip_address      NVARCHAR(50),
    user_agent      NVARCHAR(500),
    timestamp       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    description     NVARCHAR(MAX)
);
GO
CREATE INDEX IX_audit_ts      ON audit_logs(timestamp DESC);
CREATE INDEX IX_audit_user    ON audit_logs(admin_user_id);
CREATE INDEX IX_audit_action  ON audit_logs(action_type);
CREATE INDEX IX_audit_entity  ON audit_logs(entity_type);
GO

-- ── SEED: Rôles par défaut ────────────────────
IF NOT EXISTS (SELECT 1 FROM roles WHERE name='admin')
    INSERT INTO roles(name,description,is_system) VALUES('admin','Accès complet au système',1);
IF NOT EXISTS (SELECT 1 FROM roles WHERE name='utilisateur')
    INSERT INTO roles(name,description,is_system) VALUES('utilisateur','Accès utilisateur standard',1);
GO
