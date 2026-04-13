# JasperPortal — Full-Stack Report Management System

React + Flask + MS SQL Server + JasperReports Server

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, TypeScript, Tailwind CSS  |
| Backend    | Python 3.11+, Flask, Flask-JWT-Extended |
| Database   | Microsoft SQL Server 2019+          |
| Auth       | JWT (access + refresh tokens)       |
| Reports    | JasperReports Server REST API v2    |

---

## Project Structure

```
jasper-reports-app/
├── backend/
│   ├── app.py              # Flask app factory + seeding
│   ├── database.py         # SQLAlchemy instance
│   ├── models.py           # All DB models
│   ├── audit_utils.py      # Audit logging helpers + constants
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py         # Login, register, refresh
│       ├── reports.py      # User-facing report execution
│       ├── admin.py        # Admin report & access CRUD
│       ├── audit.py        # Audit log queries + export
│       └── users.py        # Admin user management
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── context/AuthContext.tsx
│   │   ├── utils/api.ts
│   │   ├── types/index.ts
│   │   ├── components/DashboardLayout.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── ReportsPage.tsx
│   │       ├── AdminReportsPage.tsx
│   │       ├── AdminUsersPage.tsx
│   │       └── AuditLogsPage.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── schema.sql              # MS SQL Server schema
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Microsoft SQL Server 2019+ (or SQL Server Express)
- ODBC Driver 17 or 18 for SQL Server
- JasperReports Server (optional for report execution)

### Install ODBC Driver (Ubuntu/Debian)
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list > /etc/apt/sources.list.d/mssql-release.list
apt-get update
ACCEPT_EULA=Y apt-get install -y msodbcsql17 unixodbc-dev
```

### Install ODBC Driver (macOS)
```bash
brew tap microsoft/mssql-release
brew install msodbcsql17
```

---

## Setup — Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your DB credentials and secrets

# 4. Initialize database (Flask will auto-create tables)
python app.py
```

The server starts at **http://localhost:5000**

Default admin credentials (seeded automatically):
- Email: `admin@jasper.com`
- Password: `Admin@123`

---

## Setup — Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

The app opens at **http://localhost:5173**

---

## Setup — Database

Run the schema manually (optional — Flask auto-creates tables):

```sql
-- In SQL Server Management Studio or sqlcmd:
sqlcmd -S localhost -U sa -P YourPassword -i schema.sql
```

---

## Environment Variables

```env
# Flask
FLASK_ENV=development
SECRET_KEY=change-this-in-production
DEBUG=True

# MS SQL Server
DB_DRIVER=ODBC Driver 17 for SQL Server
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=jasper_reports_db
DB_USER=sa
DB_PASSWORD=YourStrong@Password

# JWT (use long random strings in production)
JWT_SECRET_KEY=change-this-jwt-secret
JWT_ACCESS_TOKEN_EXPIRES=3600       # 1 hour
JWT_REFRESH_TOKEN_EXPIRES=604800    # 7 days

# JasperReports Server
JASPER_BASE_URL=http://localhost:8080/jasperserver
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## API Reference

### Auth
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | /api/auth/register    | Register new user        |
| POST   | /api/auth/login       | Login → tokens           |
| POST   | /api/auth/refresh     | Refresh access token     |
| GET    | /api/auth/me          | Get current user         |

### Reports (User)
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /api/reports/                     | List accessible reports  |
| GET    | /api/reports/:id                  | Get report + parameters  |
| POST   | /api/reports/:id/execute          | Execute & download report|

### Admin — Reports
| Method | Endpoint                                   | Description             |
|--------|--------------------------------------------|-------------------------|
| GET    | /api/admin/reports                         | All reports             |
| POST   | /api/admin/reports                         | Create report           |
| PUT    | /api/admin/reports/:id                     | Update report           |
| DELETE | /api/admin/reports/:id                     | Soft delete             |
| PATCH  | /api/admin/reports/:id/toggle-visibility   | Toggle visibility       |
| GET    | /api/admin/reports/:id/access              | Get access list         |
| POST   | /api/admin/reports/:id/access              | Grant access            |
| DELETE | /api/admin/reports/:id/access/:uid         | Revoke access           |

### Admin — Users
| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| GET    | /api/users/                 | All users             |
| POST   | /api/users/                 | Create user           |
| PUT    | /api/users/:id              | Update user           |
| PATCH  | /api/users/:id/toggle-status| Activate/deactivate   |

### Audit Logs
| Method | Endpoint                   | Description                 |
|--------|----------------------------|-----------------------------|
| GET    | /api/audit/                | Paginated logs (with filters)|
| GET    | /api/audit/stats           | Summary statistics          |
| GET    | /api/audit/export/csv      | Export CSV                  |
| GET    | /api/audit/export/xlsx     | Export Excel                |
| GET    | /api/audit/export/json     | Export JSON                 |
| GET    | /api/audit/action-types    | Distinct action types       |
| GET    | /api/audit/entity-types    | Distinct entity types       |

#### Audit Log Filter Query Params
```
?page=1&per_page=20
&search=text
&admin_user_id=1
&action_type=CREATE_REPORT
&entity_type=Report
&date_from=2025-01-01
&date_to=2025-12-31
```

---

## Tracked Audit Events

| Action Type        | Trigger                              |
|--------------------|--------------------------------------|
| LOGIN_SUCCESS      | Successful login                     |
| LOGIN_FAILED       | Failed login attempt                 |
| CREATE_REPORT      | Admin creates a report               |
| UPDATE_REPORT      | Admin edits a report                 |
| DELETE_REPORT      | Admin soft-deletes a report          |
| TOGGLE_VISIBILITY  | Admin shows/hides a report           |
| CREATE_USER        | Admin creates a user                 |
| UPDATE_USER        | Admin edits a user                   |
| DEACTIVATE_USER    | Admin deactivates a user             |
| ACTIVATE_USER      | Admin reactivates a user             |
| CHANGE_ROLE        | Admin changes a user's role          |
| GRANT_ACCESS       | Admin grants report access           |
| REVOKE_ACCESS      | Admin revokes report access          |

---

## Design Assumptions

1. **JasperReports Server** must be running separately. If unavailable, report execution returns a 502 error with a clear message.
2. **Soft deletes** — reports are never hard-deleted from the DB; `is_deleted=True` hides them.
3. **Audit logs are immutable** — there is no UI or API to edit or delete them.
4. **Admins can see all reports** regardless of visibility or access settings.
5. JWT refresh tokens are stored in `localStorage`. For production, consider `httpOnly` cookies.
6. The default admin is seeded on first startup if no admin exists.

---

## Production Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET_KEY` to strong random values
- [ ] Set `DEBUG=False` and `FLASK_ENV=production`
- [ ] Use HTTPS (TLS)
- [ ] Put Flask behind Gunicorn + Nginx
- [ ] Add SQL Server connection pooling (`pool_size`, `max_overflow` in SQLAlchemy)
- [ ] Store refresh tokens in httpOnly cookies
- [ ] Enable SQL Server Always Encrypted for sensitive columns
- [ ] Add rate limiting on `/api/auth/login`
- [ ] Set up DB backups for `audit_logs` table
