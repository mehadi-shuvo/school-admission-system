# School Admission System

## Prerequisites

For the containerised backend, install Docker Engine/Desktop with the Docker Compose v2 plugin. No local .NET SDK, PostgreSQL installation, or EF CLI is required to run it.

The repository currently contains the ASP.NET Core API and PostgreSQL integration only. The `frontend/` directory has no React source, `package.json`, or lockfile, so no frontend service can be built without inventing an application. See [Frontend status](#frontend-status).

## Environment setup

Docker Compose has local-only defaults, so the following starts the API immediately:

```sh
docker compose up --build
```

For a non-default local password or port, copy the example first:

```sh
cp .env.example .env
```

Set a strong value for `POSTGRES_PASSWORD` in `.env`. The `.env` file is ignored by Git. Do not use the committed fallback password outside an isolated local machine.

## URLs

- API: `http://localhost:8080`
- Health check: `http://localhost:8080/health`
- PostgreSQL: private to the Docker network; it has no host port mapping.

Set `BACKEND_PORT` in `.env` to use a different host port.

## Create an admission class

Create a class with a non-empty name and a positive seat capacity:

```sh
curl -i -X POST http://localhost:8080/classes \
  -H 'Content-Type: application/json' \
  -d '{"name":"Class 6 - Morning Shift","totalSeats":120}'
```

The API returns `201 Created` with `id`, `name`, and `totalSeats`. Names are trimmed before storage. A duplicate trimmed name returns `409 Conflict`; malformed or invalid input returns `400 Bad Request`.

## List admission classes

```sh
curl -i http://localhost:8080/classes
```

The API returns `200 OK` and an array of `id`, `name`, `totalSeats`, `heldSeats`, `confirmedSeats`, and `availableSeats`. HELD reservations count only while their expiry is later than the request's UTC timestamp; CONFIRMED reservations always count as occupied.

## Startup and migration strategy

The `db` service runs PostgreSQL 17 and is checked with `pg_isready`. Once healthy, the one-shot `migrate` service applies the committed EF Core migrations and exits. The API starts only after that service succeeds. This prevents the API replicas from racing to apply migrations and means evaluators do not need the EF CLI.

Migration failures are surfaced in the `migrate` container logs and prevent the API from starting:

```sh
docker compose logs migrate
```

The `postgres-data` named volume stores database data. It survives container restarts and a normal `docker compose down`. To stop safely while retaining data:

```sh
docker compose down
```

Do not use `docker compose down -v` unless intentionally deleting the local database volume.

## Health and troubleshooting

```sh
docker compose ps
curl -f http://localhost:8080/health
docker compose logs db
docker compose logs migrate
docker compose logs backend
docker compose config --quiet
```

If port 8080 is already in use, set `BACKEND_PORT` in `.env` and restart with `docker compose up --build`. If a migration does not complete, inspect `docker compose logs migrate`; do not delete the volume as a first troubleshooting step.

## Frontend status

The requested React/Vite frontend has not been initialized: there is no package manifest, lockfile, or application source to build. Per the assignment constraints, this repository intentionally does not include a made-up UI, frontend Dockerfile, Nginx configuration, or frontend Compose service. Once the frontend is added, provide its package lockfile and production build command, then add a multi-stage Dockerfile and an Nginx reverse proxy for `/api` if its API paths support that routing.
