# Loan Origination Platform — v3 (redesigned UI + register + admin-adds-staff)

Full-stack build: Next.js frontend, FastAPI backend, PostgreSQL database with
the complete 16-table schema, JWT auth, a polished responsive UI, and a working
Admin portal backed by real data.

## What's in this version

- **Database**: all 16 tables (users, banks, loan products, lending policies,
  applicant profiles, loan applications, documents, agent conversations/messages,
  credit assessments, loan decisions, escalations, AI config, integrations,
  audit logs, token blacklist), defined as SQLAlchemy models with a ready-to-run
  Alembic migration already generated (`migrations/versions/2aec7d2b2343_init.py`)
  — you don't need to run `alembic revision --autogenerate` yourself for this
  first migration, it's included.
- **Auth**: `/auth/login`, `/auth/register`, `/auth/me` — JWT-based, password
  hashing via bcrypt, role stored in the token. `/register` self-signs up as a
  **customer**; bank staff accounts can only be created by an admin.
- **Admin API**: `/admin/dashboard`, `/admin/users`, `/admin/banks`,
  `/admin/loan-products`, `/admin/lending-policies`, `/admin/audit-logs`,
  and `/admin/staff` (POST — creates a staff account, writes an audit log
  entry) — all gated to the `admin` role.
- **Seed script**: creates one bank, three loan products, one lending policy,
  and three default logins (admin/staff/customer) so you can log in immediately.
- **Redesigned, responsive frontend**: a shared UI kit (buttons, inputs, cards,
  modals, toasts, skeleton loaders, role badges) used consistently across a
  split-panel login/register, and a full Admin portal — Overview, Users
  (with an **Add staff** modal — pick a bank, set a temp password, the new
  account appears immediately), Products, Policies, Audit. Sidebar collapses
  to a mobile menu below the `lg` breakpoint. Customer and staff portals are
  still stub landing pages (their real flows come in later phases), but
  login/register and role-based redirect work for all three roles.

## Quickest path — Docker only

No Node/Python needed locally.

```bash
docker compose up --build
```

Once the containers are up, run the migration and seed (one-time):
```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

Then open **http://localhost:3000/login** and sign in with any of:

| Role     | Email               | Password      |
|----------|---------------------|---------------|
| Admin    | admin@bank.com      | Admin@123     |
| Staff    | staff@bank.com      | Staff@123     |
| Customer | customer@bank.com   | Customer@123  |

Admin lands on `/admin` with a live dashboard. Staff/customer land on simple
placeholder pages (their portals aren't built yet).

**Change these passwords / regenerate the encryption key before this goes anywhere near a real deployment** — see "Security notes" below.

## Native setup (no Docker for the apps)

### 1. Frontend
```bash
cd apps/web
npm install
```

### 2. Backend
```bash
cd services/api
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
```

### 3. Start Postgres
```bash
docker compose up -d db
```

### 4. Migrate + seed
```bash
cd services/api
alembic upgrade head
python -m scripts.seed
```

### 5. Run both apps (two terminals)
```bash
cd services/api && uvicorn app.main:app --reload
cd apps/web && npm run dev
```

## Project structure

```
apps/web/                 Next.js 14 frontend
  app/login/, app/register/  Split-panel auth pages (AuthShell component)
  app/admin/                  Admin portal (layout + Overview/Users/Products/Policies/Audit)
  app/customer/, app/staff/    Stub landing pages for those roles
  components/ui/               Shared UI kit — Button, Input/Field/Select, Card, Badge, Modal, Toast, Skeleton
  components/icons.tsx          Small dependency-free inline SVG icon set
  lib/api.ts                    Typed fetch client for the FastAPI backend
  lib/auth-context.tsx           Auth state (token + user), login/register/logout

services/api/              FastAPI backend
  app/models/                SQLAlchemy models — all 16 tables
  app/schemas/                 Pydantic request/response schemas
  app/api/routes/                auth.py, admin.py (includes POST /admin/staff)
  app/core/                       config, JWT + password hashing, role-check dependency
  app/db/                          session, declarative base, EncryptedString custom type
  migrations/                     Alembic — includes the generated initial migration
  scripts/seed.py                 Default data + demo logins
```

## Security notes (read before this leaves your laptop)

- `JWT_SECRET` and `FERNET_KEY` (in `app/core/config.py`, overridable via `.env`)
  are dev placeholders committed for convenience. Generate real ones before any
  shared or deployed use:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
- Sensitive fields (`users.phone`, `applicant_profiles.national_id`,
  `applicant_profiles.monthly_income`) are encrypted at rest via the
  `EncryptedString` column type — but only as strong as `FERNET_KEY`.
- The three seeded passwords are placeholders. Change them (or delete the seeded
  users) before this is anything but a local demo.

## Roadmap

This covers Phases 1–3 (scaffold, real schema + migration, auth) plus a slice
of Phase 5 (the Admin portal UI). Still ahead: Phase 4 (plain-CRUD loan
application flow for customer/staff), then Phase 6 (LangGraph agent layer),
Phase 7 (auto-approval/escalation logic wired to the UI), Phase 8 (AI
configuration, integrations, and audit logging actually being written to by
the app, not just displayed).
