# School Admission System

A full-stack admission-reservation system. Operators create classes; students use a 17-digit Student ID to hold, confirm, cancel, and review reservations. PostgreSQL transactions and row-level locks protect capacity under concurrent requests.

> The Student ID is an assignment-defined lookup and ownership mechanism, not authentication. Admission-fee payment is simulated; no money is processed.

## Features

- Class creation with unique names and positive capacity
- Temporary holds, hold details, and student reservation history
- Simulated confirmation, cancellation, automatic expiry, and seat reuse
- Five-second visible-tab availability refresh
- PostgreSQL-backed multi-process concurrency protection

## Technology and architecture

- ASP.NET Core 10, EF Core 10, PostgreSQL 17
- React 19, TypeScript, Vite, Tailwind CSS, and Nginx
- Docker Compose; xUnit/Testcontainers; Vitest/React Testing Library; Playwright Chromium

```text
Browser → React served by Nginx (:3000) → /api/* → ASP.NET Core (:8080) → PostgreSQL
```

The `migrate` service applies EF Core migrations after PostgreSQL is healthy. The API starts after migration succeeds. PostgreSQL is private to the Docker network and has no host port mapping.

## Repository layout

```text
backend/SchoolAdmission.Api/      API, entities, migrations, services
frontend/                         React application and browser/unit tests
tests/SchoolAdmission.Api.Tests/  xUnit and PostgreSQL integration tests
docker-compose.yml                Normal application stack
docker-compose.e2e.yml            Isolated browser-test stack
docker-compose.bonus.yml          Isolated two-backend verifier
```

## Prerequisites and quick start

Install Docker Engine or Docker Desktop with Compose v2. For local test execution, also install .NET SDK 10 and Node.js compatible with the committed lockfile.

If `.env` does not already exist, run these commands from the repository root:

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
curl -i http://localhost:8080/health
```

Local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- Health: `http://localhost:8080/health`

Stop containers while keeping the database volume:

```sh
docker compose down
```

Do not use volume-deletion commands unless intentionally discarding local data.

## Configuration

| Setting | Used by | Default / behavior |
|---|---|---|
| `POSTGRES_DB` | Normal Compose | `school_admission` |
| `POSTGRES_USER` | Normal Compose | `school_admission` |
| `POSTGRES_PASSWORD` | Normal Compose | Local-only fallback; set a private `.env` value for shared use. |
| `HOLD_DURATION_SECONDS` | API and normal Compose | `600`; positive integer required. |
| `FRONTEND_PORT` | Normal Compose | `3000`; maps Nginx port 80. |
| `HOLD_EXPIRY_SCAN_INTERVAL_SECONDS` | API configuration | `30`; positive integer required. Normal Compose does not forward it into the API container. |
| `VITE_API_BASE_PATH` | Frontend build | `/api` by default. |
| `VITE_DEV_API_TARGET` | Vite development proxy | `http://localhost:8080` by default. |

`BACKEND_PORT` appears in `.env.example`, but the current normal Compose file publishes fixed host port `8080` and does not consume it. Never commit `.env` files or production credentials.

## Migrations and persistence

The one-shot `migrate` service invokes the API with `--migrate`, which calls EF Core `Database.Migrate()`. The `postgres-data` named volume persists through backend/container restarts and a normal `docker compose down`.

```sh
docker compose logs migrate
docker compose logs backend
docker compose config --quiet
```

## Business workflow

### Class management

The frontend route `/admin/classes` creates classes. Names are trimmed, required, at most 150 characters, and unique; `totalSeats` must be positive.

```sh
curl -i -X POST http://localhost:8080/classes \
  -H 'Content-Type: application/json' \
  -d '{"name":"Class 6 - Morning Shift","totalSeats":120}'

curl -i http://localhost:8080/classes
```

### Student identity and holds

Supply exactly 17 ASCII digits in `X-Student-Id`; leading zeroes are preserved. Use the same ID for history and ownership-protected actions.

```sh
curl -i -X POST http://localhost:8080/classes/CLASS_ID/holds \
  -H 'X-Student-Id: 12345678901234567'

curl -i http://localhost:8080/holds/HOLD_ID

curl -i http://localhost:8080/me/holds \
  -H 'X-Student-Id: 12345678901234567'
```

`CLASS_ID` and `HOLD_ID` are public identifiers returned by the API.

### Simulated confirmation, cancellation, and expiry

Confirmation represents simulated fee payment. Repeating confirmation is idempotent. Cancellation releases a valid hold and is idempotent when repeated. Cancelled and expired holds no longer consume capacity.

```sh
curl -i -X POST http://localhost:8080/holds/HOLD_ID/confirm \
  -H 'X-Student-Id: 12345678901234567'

curl -i -X DELETE http://localhost:8080/holds/HOLD_ID \
  -H 'X-Student-Id: 12345678901234567'
```

Availability counts unexpired `HELD` rows and all `CONFIRMED` rows. A hosted worker conditionally persists overdue holds as `EXPIRED` at startup and on later scans. Persisted expiry is eventual; logical seat release occurs at the hold expiry timestamp. The class list polls every five seconds while the browser document is visible and refreshes when visibility returns.

## API reference

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/classes` | Create a class. |
| `GET` | `/classes` | List classes with availability. |
| `GET` | `/classes/{classId}` | Get one class with availability. |
| `POST` | `/classes/{classId}/holds` | Create a hold; requires `X-Student-Id`. |
| `GET` | `/holds/{holdId}` | Get a hold's effective status. |
| `POST` | `/holds/{holdId}/confirm` | Confirm a hold; requires `X-Student-Id`. |
| `DELETE` | `/holds/{holdId}` | Cancel a hold; requires `X-Student-Id`. |
| `GET` | `/me/holds` | Get a student's reservation history. |
| `GET` | `/health` | Check API and database health. |

Invalid IDs or Student IDs return `400`; missing resources return `404`; ownership failures return `403`; conflicts such as duplicate active reservations, no seats, or invalid state transitions return `409`.

## Concurrency and consistency

Create, confirm, and cancel run in PostgreSQL transactions and lock the class row with `SELECT ... FOR UPDATE`. Capacity counts only unexpired holds and confirmations. A filtered unique index on `(class_id, student_id)` prevents duplicate active `HELD` or `CONFIRMED` reservations. Database coordination, rather than in-memory locking, makes this safe across independent backend processes.

## Tests

From the repository root:

```sh
dotnet restore SchoolAdmissionSystem.slnx
dotnet build SchoolAdmissionSystem.slnx --no-restore
dotnet test SchoolAdmissionSystem.slnx --no-restore
```

From `frontend/`:

```sh
npm ci
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Run isolated Playwright tests from `frontend/`:

```sh
npm run e2e:up
npm run test:e2e
```

Stop the E2E stack without deleting its volume from the repository root:

```sh
docker compose -p school-admission-e2e -f docker-compose.e2e.yml down
```

Run the two-backend verifier from the repository root:

```sh
docker compose -p school-admission-bonus -f docker-compose.bonus.yml up --build --abort-on-container-exit --exit-code-from bonus-verifier bonus-verifier
```

Stop its containers while retaining the disposable volume:

```sh
docker compose -p school-admission-bonus -f docker-compose.bonus.yml down
```

### Verified results

The latest regression audit recorded 103 standard backend tests passed, with 5 Compose-environment-gated bonus tests skipped in that host suite; 39 frontend tests passed; 10 Playwright tests passed; and the 5 multi-process tests passed in each of 3 independent cycles. Docker builds, Compose validation, migration checks, and health checks also passed.

## Security, limitations, and troubleshooting

- PostgreSQL is private to the normal Compose network; only frontend and backend host ports are published.
- Interpolated EF Core raw-SQL APIs and database constraints complement service validation.
- There is no real authentication, role management, payment gateway, receipt/refund flow, email/SMS workflow, verified live deployment URL, or real-world identity proof.
- The normal Compose fallback password is appropriate only for isolated local development.

```sh
docker compose ps
docker compose logs db
docker compose logs migrate
docker compose logs backend
curl -i http://localhost:8080/health
```

If port 8080 or 3000 is occupied, free it before starting the normal stack. For migration failures, inspect `migrate` logs first; do not delete the database volume as a first response.
