# NBE Policy & Rules Lifecycle

<p align="center">
  <img src="./Logo/National_Bank_of_Egypt.svg.webp" alt="National Bank of Egypt" height="80"/>
</p>

<p align="center">
  A full-stack enterprise web application for managing the end-to-end lifecycle of policies and compliance rules at the National Bank of Egypt.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/License-UNLICENSED-red" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Roles & Permissions](#roles--permissions)
- [Policy Lifecycle](#policy-lifecycle)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Running Tests](#running-tests)

---

## Overview

The **NBE Policy & Rules Lifecycle** system provides a structured, audited workflow for creating, reviewing, approving, and tracking bank policy documents. It enforces role-based access, SLA compliance tracking, version-controlled policy documents, PDF parsing, and full audit logging — all within a modern, responsive web interface.

---

## Features

- 🔐 **JWT Authentication** — Secure login with HTTP-only cookie sessions (8-hour expiry)
- 👥 **Role-Based Access Control** — Three roles: Policy Owner (USER), Checker (CHECKER), Admin (ADMIN)
- 📄 **PDF Upload & Parsing** — Automatically extract structured policy sections from uploaded PDF documents
- 🔄 **Full Policy Lifecycle** — Draft → Queued → Under Review → Approved workflow
- 🕓 **SLA Tracking** — Configurable SLA hours per policy category; breach detection at decision time
- 📝 **Version Control** — Every policy edit creates an immutable new version with full history
- 🔍 **Version Diff Viewer** — Side-by-side diff of any two policy versions
- 🔔 **Notification System** — In-app notifications triggered by lifecycle events (Observer pattern)
- 📊 **Audit Logging** — Every action recorded with user, entity, timestamp, and IP address
- 🛡️ **Admin Dashboard** — User management, SLA configuration, review reassignment, audit reports
- 📈 **Analytics** — Dashboard charts for policy status distribution and review throughput

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| File Uploads | Multer |
| PDF Parsing | pdf-parse |
| Diffing | diff |
| Security | Helmet, CORS |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Routing | React Router DOM v7 |
| Data Fetching | TanStack Query (React Query) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |

---

## Architecture

```
+----------------------------------------------+
|                   Frontend                    |
|          React + Vite  (port 5173)           |
|   Pages: Dashboard, Owner, Checker, Admin     |
+---------------------+------------------------+
                      | REST API (JSON)
                      | HTTP-only cookies (JWT)
+---------------------v------------------------+
|                   Backend                    |
|           Express.js API  (port 5000)        |
|                                              |
|  +----------+  +---------+  +------------+  |
|  |   Auth   |  | Policy  |  |   Review   |  |
|  |  Module  |  |  Module |  |   Module   |  |
|  +----------+  +---------+  +------------+  |
|  +----------+  +---------+  +------------+  |
|  |  Admin   |  |  Audit  |  |Notification|  |
|  |  Module  |  |  Module |  |   Module   |  |
|  +----------+  +---------+  +------------+  |
|                                              |
|  +----------------------------------------+ |
|  |  Observer Event Bus (PolicyLifecycle)  | |
|  |  --> AuditLog Observer                 | |
|  |  --> Notification Observer             | |
|  +----------------------------------------+ |
+---------------------+------------------------+
                      | Prisma ORM
+---------------------v------------------------+
|              PostgreSQL Database              |
+----------------------------------------------+
```

The backend uses an **Observer pattern** for the policy lifecycle event bus — when a policy transitions state, registered observers automatically fire audit logging and user notifications.

---

## Roles & Permissions

| Action | USER (Owner) | CHECKER | ADMIN |
|---|:---:|:---:|:---:|
| Create / edit policies | ✅ | ❌ | ❌ |
| Upload & parse PDFs | ✅ | ❌ | ❌ |
| Submit policy for review | ✅ | ❌ | ❌ |
| Revise after changes requested | ✅ | ❌ | ❌ |
| View own policies | ✅ | ❌ | ❌ |
| Claim policies from queue | ❌ | ✅ | ❌ |
| Approve / request changes | ❌ | ✅ | ❌ |
| View all policies & reviews | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Configure SLA hours | ❌ | ❌ | ✅ |
| Reassign reviews | ❌ | ❌ | ✅ |
| View audit reports | ❌ | ❌ | ✅ |

---

## Policy Lifecycle

```
  [USER]                [CHECKER]              [ADMIN]
    |                       |                     |
    v                       |                     |
  DRAFT ---- submit ----> QUEUED                  |
                            |                     |
                       claim review               |
                            |                     |
                            v                     |
                      UNDER_REVIEW <---- reassign--+
                            |
              +-------------+--------------+
              |                            |
           approve                  request changes
              |                            |
              v                            v
          APPROVED                       DRAFT
         (locked)                   (new version)
```

- **CHANGES_REQUESTED** is a `PolicyReview.decision` — it moves the policy back to `DRAFT` for a new version cycle.
- **APPROVED** versions are permanently immutable.
- SLA hours are copied from `SlaConfig` at submission time and preserved even if the config later changes.

---

## Project Structure

```
NBE Policy & Rules Lifecycle/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Database schema
│   ├── src/
│   │   ├── config/                    # Environment config
│   │   ├── database/
│   │   │   ├── prisma.ts              # Prisma client singleton
│   │   │   └── seed.ts                # Demo data seeder
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # JWT verification + RBAC
│   │   │   └── errorHandler.ts       # Global error handler
│   │   ├── modules/
│   │   │   ├── auth/                  # Login, logout, JWT
│   │   │   ├── policy/                # CRUD, PDF upload, versioning
│   │   │   ├── review/                # Claim, approve, request changes
│   │   │   ├── admin/                 # User mgmt, SLA config, reassign
│   │   │   ├── audit/                 # Audit log queries & reports
│   │   │   ├── notification/          # In-app notifications
│   │   │   ├── parser/                # PDF parsing service
│   │   │   ├── health/                # Health check endpoint
│   │   │   └── events/                # Observer event bus
│   │   │       ├── policyLifecycle.subject.ts
│   │   │       └── observers/
│   │   │           ├── auditLog.observer.ts
│   │   │           └── notification.observer.ts
│   │   └── tests/                     # Integration test scripts
│   ├── uploads/policies/              # Uploaded PDF files
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── auth/                      # AuthContext + ProtectedRoute
    │   ├── components/
    │   │   ├── layout/                # AppHeader
    │   │   ├── policy/                # DiffViewer, modals, version list
    │   │   └── ui/                    # StatusBadge, Skeleton, SlaStatusBadge
    │   ├── pages/
    │   │   ├── auth/                  # LoginPage, UnauthorizedPage
    │   │   ├── owner/                 # OwnerDashboard, PolicyEditor, DiffPage
    │   │   ├── checker/               # CheckerDashboard, ReviewDetailPage
    │   │   └── admin/                 # AdminDashboard
    │   ├── types/                     # Shared TypeScript interfaces
    │   └── App.tsx                    # Router + route guards
    ├── .env.example
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14 (running locally or via Docker)
- **npm** >= 9

### Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and JWT secret

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Seed demo data (optional)
npm run seed

# 6. Start development server
npm run dev
```

The API will be available at **http://localhost:5000**

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000

# 3. Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `JWT_EXPIRES_IN` | JWT expiry duration | `8h` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000` |

---

## Database Schema

The system has seven core models:

| Model | Description |
|---|---|
| `User` | Authenticated users with roles (USER, CHECKER, ADMIN) |
| `Policy` | Top-level policy document with lifecycle status |
| `PolicyVersion` | Immutable snapshots of a policy at each revision |
| `PolicySection` | Structured content fields within a version |
| `PolicyReview` | Checker assignment and decision for a version |
| `SlaConfig` | Admin-configurable SLA hours per policy category |
| `AuditLog` | Immutable record of every system action |

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and receive JWT cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/policies` | List policies (filtered by role) |
| `POST` | `/api/policies` | Create a new policy |
| `GET` | `/api/policies/:id` | Get policy with versions |
| `POST` | `/api/policies/:id/versions` | Create new version (edit) |
| `POST` | `/api/policies/:id/submit` | Submit policy for review |
| `POST` | `/api/policies/:id/upload-pdf` | Upload and parse PDF |
| `GET` | `/api/reviews` | List review queue (CHECKER) |
| `POST` | `/api/reviews/:id/claim` | Claim a review |
| `POST` | `/api/reviews/:id/decide` | Approve or request changes |
| `GET` | `/api/admin/users` | List all users (ADMIN) |
| `POST` | `/api/admin/users` | Create user (ADMIN) |
| `GET` | `/api/admin/sla-config` | Get SLA configurations |
| `PUT` | `/api/admin/sla-config/:id` | Update SLA hours |
| `GET` | `/api/audit` | Query audit logs (ADMIN) |
| `GET` | `/api/notifications` | Get user notifications |
| `GET` | `/api/health` | Health check |

---

## Running Tests

The backend includes integration test scripts for each major feature:

```bash
cd backend

npm run test:auth          # Authentication flow
npm run test:policy        # Policy CRUD & versioning
npm run test:review        # Checker review workflow
npm run test:version-diff  # Version diff computation
npm run test:sla           # SLA breach detection
npm run test:admin         # Admin operations
npm run test:audit         # Audit log reporting
npm run test:notifications # Notification delivery
npm run test:parser        # PDF parsing
```

> **Note:** Tests run against the live database. Ensure your `.env` is configured and the database is seeded before running tests.

---

<p align="center">Built for the National Bank of Egypt — Internal Use Only</p>
