# 🚼 DevPulse API

A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** `https://devpulse-gchq.onrender.com`

---

## ✨ Features

- User registration & authentication with JWT
- Role-based access control (contributor / maintainer)
- Create, view, update, and delete issues
- Filter & sort issues by type and status
- Secure password hashing with bcrypt
- Centralized error handling

---

## 🛠️ Tech Stack

| Technology       | Usage                                 |
|------------------|---------------------------------------|
| Node.js (24.x)   | Runtime                               |
| TypeScript       | Type-safe development                 |
| Express.js       | Modular router architecture           |
| PostgreSQL        | Relational database (native pg driver)|
| bcrypt           | Password hashing (salt rounds: 10)    |
| jsonwebtoken     | JWT auth tokens                       |
| NeonDB           | Hosted PostgreSQL                     |

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone https://github.com/yourusername/devpulse.git
cd devpulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
```

### 3. Initialize database

Run `schema.sql` against your PostgreSQL instance (NeonDB / Supabase / local):

```bash
psql $DATABASE_URL -f schema.sql
```

### 4. Start development server

```bash
npm run dev
```

---

## 🌐 API Endpoints

### Auth

| Method | Endpoint            | Access  | Description           |
|--------|---------------------|---------|-----------------------|
| POST   | `/api/auth/signup`  | Public  | Register new user     |
| POST   | `/api/auth/login`   | Public  | Login & receive JWT   |

### Issues

| Method | Endpoint           | Access                            | Description              |
|--------|--------------------|-----------------------------------|--------------------------|
| POST   | `/api/issues`      | Authenticated                     | Create a new issue       |
| GET    | `/api/issues`      | Public                            | Get all issues (filter)  |
| GET    | `/api/issues/:id`  | Public                            | Get single issue         |
| PATCH  | `/api/issues/:id`  | Maintainer OR own open issue      | Update issue             |
| DELETE | `/api/issues/:id`  | Maintainer only                   | Delete issue             |

### Metrics

| Method | Endpoint        | Access      | Description              |
|--------|-----------------|-------------|--------------------------|
| GET    | `/api/metrics`  | Maintainer  | Get internal system stats|
- `sort` — `newest` (default) or `oldest`
- `type` — `bug` or `feature_request`
- `status` — `open`, `in_progress`, or `resolved`

**Authorization header format:**
```
Authorization: <JWT_TOKEN>
```

---

## 🗄️ Database Schema

### `users`
| Column     | Type         | Notes                              |
|------------|--------------|-------------------------------------|
| id         | SERIAL PK    | Auto-increment                      |
| name       | VARCHAR(255) | Required                            |
| email      | VARCHAR(255) | Required, unique                    |
| password   | VARCHAR(255) | Bcrypt hashed, never returned       |
| role       | VARCHAR(20)  | `contributor` or `maintainer`       |
| created_at | TIMESTAMPTZ  | Auto-set on insert                  |
| updated_at | TIMESTAMPTZ  | Auto-updated on change              |

### `issues`
| Column      | Type         | Notes                                   |
|-------------|--------------|------------------------------------------|
| id          | SERIAL PK    | Auto-increment                           |
| title       | VARCHAR(150) | Required, max 150 chars                  |
| description | TEXT         | Required, min 20 chars                   |
| type        | VARCHAR(20)  | `bug` or `feature_request`               |
| status      | VARCHAR(20)  | `open`, `in_progress`, `resolved`        |
| reporter_id | INTEGER      | References users.id (app-level validated)|
| created_at  | TIMESTAMPTZ  | Auto-set on insert                       |
| updated_at  | TIMESTAMPTZ  | Auto-updated on change                   |

---

## 📁 Project Structure

```
src/
├── config/
│   └── db.ts               # PostgreSQL pool configuration
├── middleware/
│   ├── auth.ts             # JWT authentication & role guards
│   └── errorHandler.ts     # Centralized error handler
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.routes.ts
│   └── issues/
│       ├── issues.controller.ts
│       └── issues.routes.ts
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   ├── db.ts               # Query helper
│   ├── jwt.ts              # Token sign/verify
│   └── response.ts         # Standardized response helpers
├── app.ts                  # Express app setup
└── index.ts                # Server entry point
```
