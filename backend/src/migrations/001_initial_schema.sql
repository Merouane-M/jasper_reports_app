-- ─────────────────────────────────────────────────
--  JasperReports Web App — SQL Server Schema
-- ─────────────────────────────────────────────────

-- ─── Roles ───────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'roles')
CREATE TABLE roles (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(50)  NOT NULL UNIQUE,
  description NVARCHAR(MAX),
  created_at  DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

INSERT INTO roles (name, description)
SELECT 'admin', 'Full system access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description)
SELECT 'user', 'Standard report access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- ─── Users ───────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email         NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  first_name    NVARCHAR(100) NOT NULL,
  last_name     NVARCHAR(100) NOT NULL,
  role_id       UNIQUEIDENTIFIER NOT NULL REFERENCES roles(id),
  is_active     BIT           NOT NULL DEFAULT 1,
  created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  updated_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Refresh Tokens ──────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'refresh_tokens')
CREATE TABLE refresh_tokens (
  id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id    UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash NVARCHAR(255)    NOT NULL,
  expires_at DATETIME2        NOT NULL,
  revoked    BIT              NOT NULL DEFAULT 0,
  created_at DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_refresh_tokens_user_id')
  CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_refresh_tokens_token_hash')
  CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─── Reports ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'reports')
CREATE TABLE reports (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  jasper_url  NVARCHAR(500) NOT NULL,
  http_method NVARCHAR(10)  NOT NULL DEFAULT 'GET',
  is_public   BIT           NOT NULL DEFAULT 0,
  is_active   BIT           NOT NULL DEFAULT 1,
  deleted_at  DATETIME2     NULL,
  created_by  UNIQUEIDENTIFIER REFERENCES users(id),
  created_at  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  updated_at  DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Report Parameters ───────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'report_parameters')
CREATE TABLE report_parameters (
  id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  report_id     UNIQUEIDENTIFIER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name          NVARCHAR(100)    NOT NULL,
  label         NVARCHAR(255)    NOT NULL,
  type          NVARCHAR(20)     NOT NULL
                  CHECK (type IN ('text','number','date','dropdown')),
  required      BIT              NOT NULL DEFAULT 0,
  default_value NVARCHAR(MAX)    NULL,
  options       NVARCHAR(MAX)    NULL,   -- JSON stored as text
  sort_order    INT              NOT NULL DEFAULT 0,
  created_at    DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_report_params_report_id')
  CREATE INDEX idx_report_params_report_id ON report_parameters(report_id);

-- ─── User Report Access ──────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_report_access')
CREATE TABLE user_report_access (
  id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id    UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id  UNIQUEIDENTIFIER NOT NULL REFERENCES reports(id),
  granted_by UNIQUEIDENTIFIER REFERENCES users(id),
  granted_at DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT uq_user_report UNIQUE (user_id, report_id)
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_ura_user_id')
  CREATE INDEX idx_ura_user_id   ON user_report_access(user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_ura_report_id')
  CREATE INDEX idx_ura_report_id ON user_report_access(report_id);

-- ─── Audit Logs (append-only via trigger) ────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_logs')
CREATE TABLE audit_logs (
  id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  admin_user_id   UNIQUEIDENTIFIER REFERENCES users(id),
  action_type     NVARCHAR(100)    NOT NULL,
  entity_type     NVARCHAR(100)    NOT NULL,
  entity_id       UNIQUEIDENTIFIER NULL,
  before_snapshot NVARCHAR(MAX)    NULL,   -- JSON
  after_snapshot  NVARCHAR(MAX)    NULL,   -- JSON
  ip_address      NVARCHAR(45)     NULL,
  user_agent      NVARCHAR(MAX)    NULL,
  created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes for common filter/sort patterns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_created_at')
  CREATE INDEX idx_audit_created_at    ON audit_logs(created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_admin_user_id')
  CREATE INDEX idx_audit_admin_user_id ON audit_logs(admin_user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_action_type')
  CREATE INDEX idx_audit_action_type   ON audit_logs(action_type);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_entity_type')
  CREATE INDEX idx_audit_entity_type   ON audit_logs(entity_type);

-- Immutability trigger: block UPDATE and DELETE on audit_logs
IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_audit_logs_immutable')
EXEC('
  CREATE TRIGGER trg_audit_logs_immutable
  ON audit_logs
  INSTEAD OF UPDATE, DELETE
  AS
  BEGIN
    RAISERROR (''Audit log records are immutable and cannot be modified or deleted.'', 16, 1);
    ROLLBACK TRANSACTION;
  END
');

-- ─── Migrations tracking ─────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'migrations')
CREATE TABLE migrations (
  id       INT IDENTITY(1,1) PRIMARY KEY,
  filename NVARCHAR(255) NOT NULL UNIQUE,
  run_at   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Default admin user (password: Admin@123) ────
INSERT INTO users (email, password_hash, first_name, last_name, role_id)
SELECT
  'admin@example.com',
  '$2b$10$rOzJqQvXbGqK5Y8LtMpO9O6AqWqHjKjL4xFkD3zP7nYmR2sVuT5Oi',
  'System',
  'Admin',
  r.id
FROM roles r
WHERE r.name = 'admin'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

