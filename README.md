# TeleMedHub

**AI-Powered Telemedicine & Smart Pharmacy Platform**

A production-grade backend built with Go, featuring modular monolith architecture with clean architecture boundaries per module.

## Architecture

- **Pattern**: Modular Monolith → Microservices-ready
- **Language**: Go
- **Router**: chi
- **Database**: PostgreSQL 16 (via pgx + sqlc)
- **Cache**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
- **Auth**: JWT (HS256) + Argon2id + refresh token rotation
- **Logging**: slog (structured JSON)

For full architecture documentation, see the `docs/` directory.

## Prerequisites

- [Go 1.23+](https://go.dev/dl/)
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [golang-migrate](https://github.com/golang-migrate/migrate) (for running migrations locally)

## Quick Start

### 1. Clone and setup

```bash
git clone https://github.com/timurdianradhasejati/telemed_hub.git
cd telemed_hub
cp .env.example .env  # Edit .env if needed
```

### 2. Start with Docker Compose

```bash
# Start all services (postgres, redis, minio, api)
make docker-up

# Or manually:
docker-compose -f deployments/docker-compose.yml up --build -d
```

### 3. Verify

```bash
# Liveness check
curl http://localhost:8080/healthz

# Readiness check (verifies DB, Redis, MinIO connectivity)
curl http://localhost:8080/readyz
```

### 4. Stop

```bash
make docker-down
```

## Running Locally (without Docker for the API)

If you prefer to run the Go app directly (with infra in Docker):

```bash
# Start only infra services
docker-compose -f deployments/docker-compose.yml up -d postgres redis minio

# Update .env with localhost endpoints:
# DATABASE_URL=postgres://telemedhub:telemedhub_secret@localhost:5432/telemedhub?sslmode=disable
# REDIS_URL=redis://localhost:6379/0
# MINIO_ENDPOINT=localhost:9000

# Run the API
make run
```

## Project Structure

```
telemedhub/
├── cmd/api/          # Application entrypoint
├── internal/         # Business modules (auth, user, doctor, appointment, ...)
│   ├── config/       # Configuration loader
│   ├── healthcheck/  # Health check handlers
│   └── shared/       # Cross-cutting concerns (AuditService, RBAC, etc.)
├── pkg/              # Generic, reusable packages (no domain knowledge)
│   ├── logger/       # slog setup
│   └── httpresponse/ # Standard JSON response envelope
├── configs/          # Config file templates
├── deployments/      # Dockerfile, docker-compose.yml
├── migrations/       # SQL migration files (golang-migrate)
├── scripts/          # Dev tooling (migrate.sh, seed.sh)
├── test/             # Integration tests and fixtures
└── docs/             # Architecture documentation (00-13)
```

## Available Make Targets

```bash
make help          # Show all available targets
make run           # Run API locally
make build         # Build binary to bin/api
make test          # Run tests with race detector
make lint          # Run golangci-lint
make docker-up     # Start all services
make docker-down   # Stop all services
make docker-logs   # Tail service logs
make migrate-up    # Apply pending migrations
make migrate-down  # Roll back last migration
```

## Documentation

| Doc | Topic |
|-----|-------|
| `docs/00-project-overview.md` | Project context and goals |
| `docs/01-product-requirements.md` | Functional & non-functional requirements |
| `docs/03-system-architecture.md` | System architecture & module boundaries |
| `docs/05-folder-structure.md` | Folder structure & dependency rules |
| `docs/06-database-design.md` | Database schema & ERD |
| `docs/07-api-design.md` | API contracts & error codes |
| `docs/08-development-roadmap.md` | Sprint plan & implementation order |
| `docs/12-engineering-summary.md` | Quick-start engineering reference |

## License

Private — for portfolio and learning purposes.
