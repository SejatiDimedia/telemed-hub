# 04 — Tech Stack

Each technology below is evaluated against alternatives, with explicit learning and production value, since this project serves both purposes simultaneously.

---

## Language: Golang

| Aspect | Detail |
|---|---|
| Why Chosen | Explicit learning goal; excellent fit for backend services (concurrency, performance, simple deployment as a single binary) |
| Alternatives | Node.js/TypeScript (already known — less learning value), Java/Kotlin (heavier ecosystem), Rust (steeper curve, less common in typical backend SaaS roles) |
| Pros | Fast compilation, strong standard library, built-in concurrency primitives, static typing, small container images |
| Cons | More verbose error handling, smaller ecosystem than Node/Java for some niches |
| Learning Value | High — primary goal of the project |
| Production Value | High — widely used at scale (Uber, Twitch, Cloudflare, Stripe infra components) |

## Router: chi (recommended) or Gin

| Aspect | Detail |
|---|---|
| Why Chosen | `chi` is idiomatic, lightweight, stdlib-`net/http`-compatible, and doesn't hide Go fundamentals behind heavy abstraction — good for learning. `Gin` is a strong alternative if a more batteries-included, higher-performance router is preferred |
| Alternatives | Gin, Echo, Fiber, stdlib `net/http` alone |
| Pros (chi) | Minimal, composable middleware, close to stdlib (deepens Go HTTP understanding) |
| Cons (chi) | Slightly less "magic"/fewer built-in helpers than Gin/Fiber |
| Learning Value | High — forces understanding of `net/http` underneath |
| Production Value | High — used in real production systems |

## ORM / SQL Library: sqlc + pgx (recommended) or GORM

| Aspect | Detail |
|---|---|
| Why Chosen | `sqlc` generates type-safe Go code from raw SQL — teaches SQL properly while keeping type safety; `pgx` is a high-performance Postgres driver. This avoids the "hidden query" problem of full ORMs, which matters for learning and for debugging transactions (critical for Wallet/Booking modules) |
| Alternatives | GORM (full ORM, faster to prototype but hides SQL, harder to reason about complex transactions), ent (schema-as-code, powerful but heavier learning curve) |
| Pros | Full SQL control, compile-time query safety, excellent performance |
| Cons | Requires writing raw SQL (more upfront effort than GORM) |
| Learning Value | High — reinforces real SQL and transaction understanding, essential for Wallet/Booking correctness |
| Production Value | High — used by companies prioritizing performance and query transparency |

## Database: PostgreSQL

| Aspect | Detail |
|---|---|
| Why Chosen | Strong relational guarantees (ACID) needed for Wallet, Booking, Orders; rich feature set (JSONB for flexible fields like AI suggestions) |
| Alternatives | MySQL (comparable, slightly less advanced feature set), MongoDB (poor fit for transactional financial/booking data) |
| Pros | Transactions, row-level locking, JSONB, mature ecosystem |
| Cons | Slightly more operational overhead than simpler datastores |
| Learning Value | High — transactions/locking are core learning objectives |
| Production Value | Very high — industry standard for transactional systems |

## Cache: Redis

| Aspect | Detail |
|---|---|
| Why Chosen | Fast key-value store for caching availability lookups, session/rate-limit data, and later as a lightweight queue (Streams) for notifications |
| Alternatives | Memcached (simpler but no data structures/streams), in-process caching (doesn't scale across instances) |
| Pros | Versatile (cache, pub/sub, streams), simple to operate, widely documented |
| Cons | Adds an operational dependency; cache invalidation requires discipline |
| Learning Value | High — caching strategy, TTL design, later queue patterns |
| Production Value | High — near-universal in production backends |

## Object Storage: MinIO

| Aspect | Detail |
|---|---|
| Why Chosen | S3-compatible, self-hostable, ideal for local Docker Compose development while mirroring real AWS S3 API for production |
| Alternatives | Direct AWS S3 (costs money, less convenient locally), local filesystem storage (not production-realistic) |
| Pros | S3 API compatibility, easy local dev via Docker, teaches real object-storage patterns (presigned URLs) |
| Cons | Requires additional container in local setup |
| Learning Value | High — object storage patterns transfer directly to AWS S3/GCS in real jobs |
| Production Value | High — same API surface as AWS S3 |

## Auth: JWT (with refresh tokens)

| Aspect | Detail |
|---|---|
| Why Chosen | Stateless auth suits a modular monolith that may split into services later; refresh tokens mitigate short-lived access token risk |
| Alternatives | Session-based auth (simpler but stateful, harder to scale horizontally without shared session store), OAuth2/OIDC via third-party (overkill for MVP, valuable for future SSO) |
| Pros | Stateless, scalable, standard across the industry |
| Cons | Requires careful handling of token revocation/refresh flow; access tokens cannot be revoked mid-TTL (mitigated by short 15-min TTL + Redis blocklist for forced logouts) |
| Learning Value | High — a near-universal real-world requirement |
| Production Value | High |

## Password Hashing: Argon2id

| Aspect | Detail |
|---|---|
| Why Chosen | **Argon2id** is the winner of the Password Hashing Competition (2015) and is recommended over bcrypt for new systems. It is memory-hard (resistant to GPU/ASIC brute-force) and combines the side-channel resistance of Argon2i with the GPU resistance of Argon2d |
| Parameters (production) | `time=1`, `memory=64MB` (65536 KiB), `parallelism=4`, `keyLen=32` — tuned to ~100ms on a 2-core VM |
| Alternatives | bcrypt (widely used, good, but lacks memory hardness), scrypt (similar memory hardness but more complex API), PBKDF2 (NIST-approved but weaker than Argon2) |
| Pros | Best-in-class resistance to offline brute-force attacks; Go stdlib `golang.org/x/crypto/argon2` |
| Cons | Slightly more complex to implement than bcrypt; algorithm parameter changes require a migration (hash existing passwords on next login) |
| Learning Value | High — understanding modern password storage is essential for any production system |
| Production Value | High — standard recommendation for new systems as of 2024+ |

## Database Migrations: golang-migrate

| Aspect | Detail |
|---|---|
| Why Chosen | `golang-migrate` is the de-facto standard migration tool in the Go ecosystem. Supports up/down migration files, PostgreSQL, and works both as a CLI tool and as a Go library (for test setup via testcontainers) |
| Alternatives | `goose` (good, but slightly less ecosystem traction), `atlas` (powerful schema-as-code, higher complexity), `flyway`/`liquibase` (JVM-based, out of scope) |
| Pros | Simple numbered file naming (`0001_create_users.up.sql` / `.down.sql`), PostgreSQL-native, CI-friendly CLI |
| Cons | No schema diffing (migrations are hand-written SQL); rollback requires discipline |
| File Naming | `migrations/{NNNN}_{descriptive_name}.{up|down}.sql` — sequential integers for ordering |
| Learning Value | Medium — understanding migration hygiene (always write `.down.sql`, test rollback) is a production discipline |
| Production Value | High — used in many production Go projects |

## Containerization: Docker + Docker Compose

| Aspect | Detail |
|---|---|
| Why Chosen | Standard for local parity and eventual deployment; Compose orchestrates Postgres/Redis/MinIO alongside the app with one command |
| Alternatives | Bare-metal local setup (no parity with prod), Kubernetes from day one (excessive complexity for current stage) |
| Pros | Reproducible environments, easy onboarding, prod-like locally |
| Cons | Some learning curve around networking/volumes |
| Learning Value | High |
| Production Value | High |

## Testing Framework: Go stdlib `testing` + `testify` + `testcontainers-go`

| Aspect | Detail |
|---|---|
| Why Chosen | stdlib testing is idiomatic; `testify` adds readable assertions/mocking; `testcontainers-go` enables real Postgres/Redis in integration tests instead of fragile mocks |
| Alternatives | Ginkgo/Gomega (BDD-style, heavier), pure stdlib only (more verbose assertions) |
| Pros | Realistic integration tests, good mocking ergonomics |
| Cons | testcontainers adds test run time and Docker dependency in CI |
| Learning Value | High — real testing discipline expected in production teams |
| Production Value | High |

## API Documentation: Swagger / OpenAPI (via `swaggo` or hand-written spec)

| Aspect | Detail |
|---|---|
| Why Chosen | Keeps API contracts explicit and versioned; useful given documentation-first philosophy of this project |
| Alternatives | Postman collections only (less standard, harder to keep in sync), no formal spec (violates documentation-first principle) |
| Pros | Auto-generated docs from code annotations (swaggo) or explicit contract-first spec |
| Cons | Annotation-based generation can drift if discipline lapses |
| Learning Value | Medium-High |
| Production Value | High — expected in most professional API teams |

## Logging: `slog` (Go standard library structured logging, Go 1.21+)

| Aspect | Detail |
|---|---|
| Why Chosen | Structured JSON logging is now built into the standard library — no external dependency needed, and it's the direction the Go ecosystem is standardizing on |
| Alternatives | `zap` (faster, more configurable, widely used in high-throughput production systems), `zerolog` |
| Pros | Zero extra dependency, structured output, good enough performance for this project's scale |
| Cons | Slightly less feature-rich than zap for very high-throughput logging needs |
| Learning Value | High — understand structured logging fundamentals before reaching for a specialized library |
| Production Value | Medium-High (can migrate to `zap` later if throughput demands it) |

## Configuration Management: `viper` or plain environment variables + `envconfig`

| Aspect | Detail |
|---|---|
| Why Chosen | `envconfig`-style plain env var loading keeps configuration simple and 12-factor-compliant; `viper` is a reasonable step-up if config files/multiple sources are needed later |
| Alternatives | Hardcoded config (unacceptable for production-oriented project), full `viper` from the start (more powerful but more complexity than needed initially) |
| Pros | Simple, explicit, container/12-factor friendly |
| Cons | Plain env vars require manual validation of required fields |
| Learning Value | Medium |
| Production Value | High |

## Secret Management (Production): External Secret Store

| Aspect | Detail |
|---|---|
| Why Chosen | Secrets (JWT signing key, DB credentials, LLM API key, MinIO credentials) must never be stored in the repository or unencrypted CI/CD environment variable registries |
| Local Dev | `.env` file (gitignored); `.env.example` committed with placeholder values |
| CI/CD | GitHub Actions Encrypted Secrets (for Sprint 18 MVP deployment) — secrets are injected as env vars at runtime |
| Production | For post-MVP: **AWS Secrets Manager**, **HashiCorp Vault**, or **GCP Secret Manager** — secrets fetched at startup and injected into the typed config struct. No secrets in container images or Compose files |
| Pros | Decouples secrets lifecycle from code deploy; enables rotation without code change |
| Learning Value | Medium — fundamental production hygiene |
| Production Value | High |

## Message Queue (Future): Redis Streams → RabbitMQ/Kafka (if warranted)

| Aspect | Detail |
|---|---|
| Why Chosen | Redis Streams is a pragmatic starting point since Redis is already in the stack; can graduate to RabbitMQ or Kafka if throughput/durability needs grow |
| Alternatives | RabbitMQ (robust, more ops overhead), Kafka (overkill at this project's scale initially) |
| Pros | Low operational cost to start, natural fit with existing Redis dependency |
| Cons | Less feature-rich than dedicated brokers for complex routing needs |
| Learning Value | High — introduces async/event-driven thinking |
| Production Value | Medium initially, High if migrated to Kafka/RabbitMQ later |

## gRPC (Future)

| Aspect | Detail |
|---|---|
| Why Chosen | Once modules are extracted into separate services, gRPC + protobuf gives strongly-typed, efficient inter-service contracts |
| Alternatives | REST/JSON for internal calls (simpler but less efficient and weakly typed) |
| Pros | Strong typing via protobuf, efficient binary protocol, code generation |
| Cons | Additional tooling/build step; unnecessary until services are actually split |
| Learning Value | High — standard in many microservice-based companies |
| Production Value | High, once modules are extracted into standalone services |

---

## Summary Stack Table

| Layer | Technology |
|---|---|
| Language | Go |
| Router | chi (or Gin) |
| DB Access | sqlc + pgx |
| Database | PostgreSQL |
| Cache | Redis |
| Object Storage | MinIO (dev) → S3-compatible (prod) |
| Auth | JWT (HS256) + Argon2id + refresh tokens |
| DB Migrations | golang-migrate |
| Containerization | Docker + Docker Compose |
| Testing | testing + testify + testcontainers-go |
| API Docs | Swagger/OpenAPI (swaggo) |
| Logging | slog (stdlib, structured JSON) |
| Config | envconfig / viper + env vars |
| Secrets (prod) | GitHub Secrets (CI/CD) → AWS Secrets Manager / Vault |
| Queue (Sprint 10+) | Redis Streams → RabbitMQ/Kafka (if warranted) |
| Internal RPC (future) | gRPC + protobuf |

> **MinIO Production Note:** Single-instance MinIO is suitable for local development only. For production, use a managed S3-compatible service (AWS S3, GCS, Cloudflare R2) or deploy MinIO in distributed mode with persistent volumes. Never run single-instance MinIO with ephemeral storage in production.

---

**End of Phase 1 documentation set.** See summary below for how these documents connect and what comes next.
