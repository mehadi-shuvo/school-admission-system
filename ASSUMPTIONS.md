# Assumptions

- Docker Compose v2 is available to evaluators. The Compose project uses standard health-condition dependencies supported by current Compose v2.
- The existing EF Core entity configurations describe the initial database schema, because no migrations were present in the repository.
- `postgres:17.4-alpine`, the .NET SDK 10.0.403 Noble image, and the ASP.NET runtime 10.0.14 Noble image are suitable pinned base images for the target Linux/Docker environment.
- The default PostgreSQL password exists only to satisfy the single-command, local-evaluation experience. It is public and must be replaced through `.env` for any shared or non-local environment.
- The API can expose the additive `/health` endpoint without changing existing assignment API contracts.
- No frontend Docker integration is included because `frontend/` contains no application, package manifest, or lockfile. Adding one would require inventing UI behavior and package-management choices.
