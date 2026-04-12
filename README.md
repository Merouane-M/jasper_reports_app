# JasperReports Web Portal

A production-ready web application for managing and running JasperReports Server reports, with role-based access control and a full immutable audit trail.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + TypeScript + Tailwind CSS |
| Backend    | Node.js + Express + TypeScript       |
| Database   | PostgreSQL 14+                       |
| Auth       | JWT (access + refresh token rotation)|
| Reports    | JasperReports Server REST API v2     |
| Export     | ExcelJS (XLSX), native CSV/JSON      |

---

## Project Structure

```
jasper-reports-app/
├── backend/
│   ├── src/
│   │   ├── index.ts                        # Express app entry point
│   │   ├── db.ts                           # PostgreSQL pool
│   │   ├── auth/
│   │   │   ├── auth.service.ts             # register, login, refresh, logout
│   │   │   └── auth.routes.ts
│   │   ├── reports/
│   │   │   ├── reports.service.ts          # CRUD, parameters, access
│   │   │   └── reports.routes.ts
│   │   ├── users/
│   │   │   └── users.routes.ts
│   │   ├── jasper/
│   │   │   └── jasper.routes.ts            # JasperReports REST v2 client
│   │   ├── audit/
│   │   │   └── audit.routes.ts             # logs, filters, export
│   │   ├── common/middleware/
│   │   │   ├── auth.middleware.ts          # JWT verify + RBAC
│   │   │   └── audit.middleware.ts         # auto-log admin actions
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql      # full schema
│   │       └── run.ts                      # idempotent runner
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                         # routing
│   │   ├── index.css                       # Tailwind + component classes
│   │   ├── types/index.ts
│   │   ├── services/api.ts                 # Axios client + all API calls
│   │   ├── hooks/useAuth.tsx               # Auth context + provider
│   │   ├── components/layout/AppLayout.tsx # sidebar + nav
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── DashboardPage.tsx           # report list for users
│   │       ├── ReportRunPage.tsx           # dynamic parameter form + preview
│   │       └── admin/
│   │           ├── AdminReportsPage.tsx    # full report CRUD + params + access
│   │           ├── AdminUsersPage.tsx      # user management + roles
│   │           └── AuditPage.tsx           # logs, filters, pagination, export
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── docs/
    └── sample_audit_logs.json
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A running JasperReports Server instance (6.x or later)

---

## Setup

### 1. Database

```bash
createdb jasper_reports
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, and Jasper URL
npm install
npm run migrate       # runs all SQL migrations
npm run dev           # starts on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:3000
```

---

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `DB_*`                | PostgreSQL connection settings           |
| `JWT_SECRET`          | Min 32-char random string                |
| `JWT_REFRESH_SECRET`  | Separate secret for refresh tokens       |
| `JASPER_BASE_URL`     | e.g. `http://localhost:8080/jasperserver`|
| `JASPER_USERNAME`     | JasperReports admin username             |
| `JASPER_PASSWORD`     | JasperReports admin password             |
| `FRONTEND_URL`        | Used for CORS (default: `localhost:3000`)|

---

## Default Admin Account

After running migrations, a default admin account is created:

- **Email:** `admin@example.com`
- **Password:** `Admin@123`

Change this password immediately after first login.

---

## API Reference

### Auth
| Method | Endpoint              | Description            |
|--------|-----------------------|------------------------|
| POST   | `/api/auth/register`  | Register new user      |
| POST   | `/api/auth/login`     | Login → tokens         |
| POST   | `/api/auth/refresh`   | Rotate refresh token   |
| POST   | `/api/auth/logout`    | Revoke refresh token   |

### Reports
| Method | Endpoint                          | Access | Description              |
|--------|-----------------------------------|--------|--------------------------|
| GET    | `/api/reports`                    | All    | List accessible reports  |
| GET    | `/api/reports/:id`                | All    | Get report + parameters  |
| POST   | `/api/reports`                    | Admin  | Create report            |
| PUT    | `/api/reports/:id`                | Admin  | Update report            |
| DELETE | `/api/reports/:id`                | Admin  | Soft-delete report       |
| PATCH  | `/api/reports/:id/toggle`         | Admin  | Toggle active status     |
| POST   | `/api/reports/:id/parameters`     | Admin  | Replace all parameters   |
| POST   | `/api/reports/:id/access`         | Admin  | Grant access to user     |
| DELETE | `/api/reports/:id/access`         | Admin  | Revoke access            |

### Jasper Execution
| Method | Endpoint                        | Description                   |
|--------|---------------------------------|-------------------------------|
| POST   | `/api/jasper/execute/:reportId` | Execute + stream report output |

Request body: `{ "parameters": { "startDate": "2025-01-01" }, "format": "pdf" }`

### Audit Logs (Admin only)
| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/api/audit`        | Paginated logs with filters              |
| GET    | `/api/audit/export` | Export (add `?format=csv|xlsx|json`)     |
| GET    | `/api/audit/meta`   | Available action/entity types for UI     |

**Audit filter params:** `from`, `to`, `adminUserId`, `actionType`, `entityType`, `search`, `page`, `limit`

### Users (Admin only)
| Method | Endpoint                   | Description               |
|--------|----------------------------|---------------------------|
| GET    | `/api/users`               | List all users            |
| PUT    | `/api/users/:id/role`      | Change user role          |
| PATCH  | `/api/users/:id/toggle`    | Activate / deactivate     |
| GET    | `/api/users/:id/access`    | List user's report access |

---

## Security Design

- **Passwords** hashed with bcrypt (10 rounds)
- **Access tokens** expire in 15 minutes; **refresh tokens** rotate on every use
- **Refresh tokens** stored as SHA-256 hashes — plain token never persisted
- **Audit logs** are made immutable via PostgreSQL `RULE` — no `UPDATE` or `DELETE` is possible from any connection
- **Rate limiting** applied globally (100 req/15min) and stricter on auth endpoints (20 req/15min)
- **Input validation** on all write endpoints via `express-validator`
- **CORS** restricted to `FRONTEND_URL`
- **Helmet** sets secure HTTP headers

---

## Audit Trail Design

All admin actions are automatically intercepted by `audit.middleware.ts`:

1. Request comes in to a mutating endpoint (`POST`/`PUT`/`PATCH`/`DELETE`)
2. Middleware checks: is the user authenticated and is their role `admin`?
3. It maps the HTTP method + path to an `action_type` (e.g. `DELETE /api/reports/:id` → `DELETE_REPORT`)
4. It captures the request body as `before_snapshot`
5. It wraps `res.json` to capture the response as `after_snapshot`
6. On successful response (status < 400), it writes to `audit_logs` with IP and user agent

The `audit_logs` table has a PostgreSQL `RULE` that silently swallows any `UPDATE` or `DELETE` statements — the records are permanently immutable.

---

## Assumptions

1. JasperReports Server uses REST API v2 (standard for JRS 6.x+). If using v1, update the client in `jasper.routes.ts`.
2. Report parameters are defined in the portal (not pulled from JasperReports directly). This gives admins full control over what users see.
3. Refresh tokens are stored in `localStorage` on the frontend. For higher security environments, consider `httpOnly` cookies instead.
4. The default admin password in the seed data is a bcrypt hash of `Admin@123` — change it immediately in production.
5. The audit middleware captures the full request body as `before_snapshot`. Sensitive fields like `password` should be stripped before logging — add a sanitizer in `audit.middleware.ts` for production.
