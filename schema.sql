-- ============================================================
-- JasperPortal Database Schema — MS SQL Server
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'jasper_reports_db')
    CREATE DATABASE jasper_reports_db;
GO

USE jasper_reports_db;
GO

-- ────────────────────────────────────────────
-- ROLES
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.roles', 'U') IS NULL
CREATE TABLE roles (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(50)  NOT NULL UNIQUE,
    description NVARCHAR(255)
);
GO

-- ────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.users', 'U') IS NULL
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

CREATE INDEX IX_users_email    ON users(email);
CREATE INDEX IX_users_role_id  ON users(role_id);
GO

-- ────────────────────────────────────────────
-- REPORTS
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.reports', 'U') IS NULL
CREATE TABLE reports (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    jasper_url  NVARCHAR(500) NOT NULL,
    http_method NVARCHAR(10)  NOT NULL DEFAULT 'GET',
    is_public   BIT           NOT NULL DEFAULT 0,
    is_visible  BIT           NOT NULL DEFAULT 1,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_by  INT REFERENCES users(id),
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2
);
GO

CREATE INDEX IX_reports_is_deleted ON reports(is_deleted);
CREATE INDEX IX_reports_is_visible ON reports(is_visible);
GO

-- ────────────────────────────────────────────
-- REPORT PARAMETERS
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.report_parameters', 'U') IS NULL
CREATE TABLE report_parameters (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    report_id        INT          NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    name             NVARCHAR(100) NOT NULL,
    label            NVARCHAR(255),
    param_type       NVARCHAR(50)  NOT NULL,   -- text | number | date | dropdown
    is_required      BIT           NOT NULL DEFAULT 0,
    default_value    NVARCHAR(500),
    dropdown_options NVARCHAR(MAX),             -- JSON array
    display_order    INT           NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_report_params_report_id ON report_parameters(report_id);
GO

-- ────────────────────────────────────────────
-- USER REPORT ACCESS
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.user_report_access', 'U') IS NULL
CREATE TABLE user_report_access (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id   INT       NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    granted_by  INT REFERENCES users(id),
    granted_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_user_report UNIQUE (user_id, report_id)
);
GO

-- ────────────────────────────────────────────
-- AUDIT LOGS  (immutable — no UPDATE/DELETE)
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.audit_logs', 'U') IS NULL
CREATE TABLE audit_logs (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    admin_user_id   INT           NOT NULL REFERENCES users(id),
    action_type     NVARCHAR(100) NOT NULL,
    entity_type     NVARCHAR(100) NOT NULL,
    entity_id       INT,
    entity_name     NVARCHAR(255),
    changes_before  NVARCHAR(MAX),   -- JSON
    changes_after   NVARCHAR(MAX),   -- JSON
    ip_address      NVARCHAR(50),
    user_agent      NVARCHAR(500),
    timestamp       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    description     NVARCHAR(MAX)
);
GO

-- Performance indexes
CREATE INDEX IX_audit_timestamp     ON audit_logs(timestamp DESC);
CREATE INDEX IX_audit_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX IX_audit_action_type   ON audit_logs(action_type);
CREATE INDEX IX_audit_entity_type   ON audit_logs(entity_type);
GO

-- ────────────────────────────────────────────
-- SEED: Default roles
-- ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
    INSERT INTO roles (name, description) VALUES ('admin', 'Full system access');
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user')
    INSERT INTO roles (name, description) VALUES ('user', 'Standard user access');
GO

-- ────────────────────────────────────────────
-- SEED: Sample audit log entries
-- ────────────────────────────────────────────
-- (These will be created automatically by the app on first login / actions)
-- Example of what they look like:
/*
INSERT INTO audit_logs (admin_user_id, action_type, entity_type, entity_id, entity_name,
    changes_after, ip_address, timestamp, description)
VALUES
(1, 'LOGIN_SUCCESS', 'Auth',   1, 'admin',       NULL,                         '127.0.0.1', SYSUTCDATETIME(), 'Successful login for admin@jasper.com'),
(1, 'CREATE_REPORT', 'Report', 1, 'Sales Report',
    '{"name":"Sales Report","jasper_url":"/reports/sales","is_public":true}',   '127.0.0.1', SYSUTCDATETIME(), 'Created report Sales Report'),
(1, 'GRANT_ACCESS',  'UserReportAccess', 1, 'johndoe -> Sales Report', NULL,   '127.0.0.1', SYSUTCDATETIME(), 'Granted johndoe access to Sales Report');
*/
GO
