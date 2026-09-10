# Loan Origination Platform — v4 (bank hierarchy, self-service staff, auto-approval routing)

Full-stack build: Next.js frontend, FastAPI backend, PostgreSQL database with
the complete 16-table schema (plus this version's two new tables), JWT auth,
a polished responsive UI, and three working portals — Admin, Bank staff, and
Customer — all backed by real data.

## What's new in v4

- **Bank position ladder**: each bank now has its own configurable approval
  hierarchy (`bank_positions` — e.g. Loan Officer → Credit Manager → CFO →
  CEO → Board), seeded per bank with a title, rank, an approval limit
  (`max_approval_amount`, nullable = unlimited), and two permission flags:
  `can_manage_staff` and `can_manage_products`. Nothing about the hierarchy
  is hardcoded — an admin (or any staff member with `can_manage_staff`) can
  shape it differently per bank.
- **Bank self-service portal** (`/staff`): staff log in and land in a
  dedicated portal scoped to their own bank. What they can do depends on
  their position:
  - **Team** (gated on `can_manage_staff`) — register new staff for the bank
    and assign them a position at creation time.
  - **Products** and **Policies** (gated on `can_manage_products`) — add
    loan products and auto-approval policies for the bank.
  - **Applications** — every application submitted to the bank, with status
    and (if escalated) which position needs to approve it next.
  - **Notifications** — a bell with an unread badge; alerts land here when
    an application needs that staff member's position to approve it.
  A staff member without a position, or whose position lacks a permission,
  sees a "Restricted" message instead of the management UI — enforced both
  in the UI (nav links are hidden) and on the API (403 if bypassed).
- **Deterministic decision routing** (`app/core/lending_logic.py`): every
  submitted application is checked against the bank's lending policy first.
  Under the auto-approval threshold → approved immediately. Over it → routed
  to the lowest position on the bank's ladder whose approval limit actually
  covers the amount, and every staff member holding that position gets a
  notification. This is deliberately a plain deterministic function, not an
  LLM call — it's the seed of the Decision Agent (FR8) for a later phase.
- **Customer loan application flow** (`/customer`): browse products across
  banks, apply with an amount/tenure/purpose, and see the outcome
  immediately — auto-approved, or under review with the position it's
  pending on. A running list of "My applications" shows status for every
  past submission.
- **Admin → staff creation now includes position assignment**: the existing
  Admin "Add staff" modal gained a Position dropdown (scoped to the chosen
  bank), so admins can create fully-configured staff accounts too, not just
  bank self-service.
- Two new tables: `bank_positions` and `notifications`, plus new columns
  (`users.position_id`, `escalations.escalated_to_position_id`) — see
  `migrations/versions/e80fc8b39b2c_bank_hierarchy_and_notifications.py`.

## Quickest path — Docker only

No Node/Python needed locally.

```bash
docker compose up --build
```

Once the containers are up, run migrations and seed (one-time — or again if
you're upgrading from v3, see "Upgrading from v3" below):
```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

Then open **http://localhost:3000/login** and sign in with any of:

| Role                          | Email               | Password       |
|--------------------------------|---------------------|----------------|
| Admin (platform-wide)          | admin@bank.com      | Admin@123      |
| Staff — Credit Manager         | manager@bank.com    | Manager@123    |
| Staff — Loan Officer           | officer@bank.com    | Officer@123    |
| Customer                       | customer@bank.com   | Customer@123   |

Admin lands on `/admin`. The Credit Manager lands on `/staff` with full bank
self-service (Team, Products, Policies, Applications, Notifications). The
Loan Officer lands on the same portal but only sees Overview, Applications
and Notifications — Team/Products/Policies are hidden and blocked, since
that position's `can_manage_staff`/`can_manage_products` are both `false`.
The customer lands on `/customer` and can apply for a loan right away.

**Change these passwords / regenerate the encryption key before this goes anywhere near a real deployment** — see "Security notes" below.

### Upgrading from v3

If you already have a v3 database running, you only need to run the new
migration — your data is preserved:
```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```
The seed script is idempotent and safe to re-run. Note: the old
`staff@bank.com` account from v3 no longer exists in the seed — it's been
replaced with `manager@bank.com` (Credit Manager) and `officer@bank.com`
(Loan Officer) so the position hierarchy has something to demonstrate. If
you created other staff accounts under v3, they'll have `position_id = null`
until you (or a manager) assign them one from the Team page.

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
  app/staff/                   Bank self-service portal:
    layout.tsx                   Sidebar shell, permission-gated nav, notification bell
    page.tsx                     Overview (position, approval limit, pending counts)
    team/, products/, policies/  Permission-gated management pages (Add-* modals)
    applications/                 All applications submitted to the bank
    notifications/                 Position-targeted alerts, mark-as-read
  app/customer/               Apply-for-a-loan form + "My applications" list
  components/ui/               Shared UI kit — Button, Input/Field/Select, Card, Badge, Modal, Toast, Skeleton
  components/icons.tsx          Small dependency-free inline SVG icon set
  lib/api.ts                    Typed fetch client for the FastAPI backend
  lib/auth-context.tsx           Auth state (token + user), login/register/logout
  lib/staff-context.tsx           Bank positions + notifications for the staff portal

services/api/              FastAPI backend
  app/models/                SQLAlchemy models — 16 tables + bank_positions, notifications
  app/schemas/                 Pydantic request/response schemas (schemas/bank.py is new)
  app/api/routes/                auth.py, admin.py, bank.py (staff self-service), loans.py (customer)
  app/core/                       config, JWT + password hashing, deps.py (role/permission checks),
                                    lending_logic.py (auto-approve/escalate routing)
  app/db/                          session, declarative base, EncryptedString custom type
  migrations/                     Alembic — init + bank-hierarchy-and-notifications
  scripts/seed.py                 Default data, demo logins, and the position ladder
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
- The seeded passwords are placeholders. Change them (or delete the seeded
  users) before this is anything but a local demo.
- Position/permission checks are enforced server-side
  (`require_bank_permission` in `app/core/deps.py`) on every mutating bank
  endpoint — the UI hiding a nav link is a convenience, not the security
  boundary.

## Roadmap

This covers Phases 1–3 (scaffold, real schema + migration, auth), Phase 5
(Admin portal UI), and now a first pass at Phase 4/7 (plain-CRUD loan
application flow, wired to deterministic auto-approval/escalation routing
and position-based notifications). Still ahead: Phase 6 (the LangGraph
multi-agent layer — a conversational Loan Broker agent for intake, a
Document Intelligence agent for OCR/verification, a Credit Bureau
integration agent, and a Decision Agent that wraps today's deterministic
`route_loan_decision` with LLM-assisted reasoning), Phase 8 (AI
configuration and integrations actually being written to by the app, not
just displayed), and document upload/verification (FR5/FR6).
