# 02 — Learning Roadmap

This roadmap sequences Golang concepts so that **every concept is learned right before it's needed** to build a real piece of TeleMedHub. Each phase produces a working, demoable increment — not an isolated exercise.

Legend: **Duration** is elapsed calendar time assuming part-time (evenings/weekends) study.

---

## Phase 0 — Go Fundamentals Refresh

| Item | Detail |
|---|---|
| Learning Objective | Re-establish Go syntax, tooling, modules, structs, interfaces, error handling |
| Estimated Duration | 1–2 weeks |
| Skills Gained | `go mod`, structs, interfaces, pointers, error handling (`errors`, `fmt.Errorf`, wrapping), basic concurrency (`goroutines`, `channels`) |
| Related TeleMedHub Feature | Foundation for all services — no feature yet |
| Portfolio Milestone | A small CLI or REST "Hello Domain" skeleton using Clean Architecture folder layout |

## Phase 1 — URL Shortener Service (Warm-up Project)

| Item | Detail |
|---|---|
| Learning Objective | Build first real REST API: routing, handlers, request/response DTOs, in-memory → PostgreSQL persistence |
| Estimated Duration | 1 week |
| Skills Gained | HTTP routing (chi/gin/fiber), JSON handling, basic PostgreSQL queries, layered architecture (handler → usecase → repository) |
| Related TeleMedHub Feature | Establishes the base project skeleton reused for all future services |
| Portfolio Milestone | Standalone URL Shortener API with tests |

## Phase 2 — Authentication Service

| Item | Detail |
|---|---|
| Learning Objective | Implement secure auth: password hashing, JWT issuance/verification, middleware-based RBAC |
| Estimated Duration | 1–2 weeks |
| Skills Gained | bcrypt/argon2, JWT libraries, middleware patterns, context propagation |
| Related TeleMedHub Feature | Identity & Access module (FR-1 to FR-4) |
| Portfolio Milestone | Auth service with register/login/refresh + RBAC middleware, unit tested |

## Phase 3 — Booking Management System

| Item | Detail |
|---|---|
| Learning Objective | Model complex relational data; handle transactional consistency (no double-booking) |
| Estimated Duration | 2 weeks |
| Skills Gained | PostgreSQL transactions, row-level locking (`SELECT ... FOR UPDATE`), relational schema design, time/timezone handling |
| Related TeleMedHub Feature | Appointment & Scheduling module (FR-5 to FR-8) |
| Portfolio Milestone | Booking API preventing race-condition double-bookings, load-tested |

## Phase 4 — Inventory Management API → Pharmacy Orders

| Item | Detail |
|---|---|
| Learning Objective | Model stateful entities with lifecycle transitions; enforce valid state machines |
| Estimated Duration | 1–2 weeks |
| Skills Gained | State machine patterns in Go, validation layers, structured error types |
| Related TeleMedHub Feature | Pharmacy & Orders module (FR-12 to FR-14) |
| Portfolio Milestone | Order lifecycle API (`pending → processing → shipped → delivered`) |

## Phase 5 — Digital Wallet API

| Item | Detail |
|---|---|
| Learning Objective | Implement atomic financial operations, ledger design, idempotency |
| Estimated Duration | 1–2 weeks |
| Skills Gained | DB transactions across multiple tables, idempotency keys, optimistic/pessimistic locking |
| Related TeleMedHub Feature | Wallet module (FR-18 to FR-20) |
| Portfolio Milestone | Wallet API with top-up/deduct, race-condition-safe under concurrent load tests |

## Phase 6 — Redis & Caching Layer

| Item | Detail |
|---|---|
| Learning Objective | Introduce caching for read-heavy endpoints (doctor availability, records) |
| Estimated Duration | 3–5 days |
| Skills Gained | Redis client usage, cache invalidation strategies, TTL design |
| Related TeleMedHub Feature | Performance layer across Scheduling & Records |
| Portfolio Milestone | Cached availability-lookup endpoint with measurable latency improvement |

## Phase 7 — File Management Service (MinIO)

| Item | Detail |
|---|---|
| Learning Objective | Handle object storage: upload, presigned URLs, access-controlled retrieval |
| Estimated Duration | 1 week |
| Skills Gained | MinIO/S3 SDK usage, multipart uploads, presigned URL generation |
| Related TeleMedHub Feature | File/Media module (FR-26, FR-27) |
| Portfolio Milestone | File upload/download service integrated with RBAC checks |

## Phase 8 — Notification Service (Worker Pool + Queue)

| Item | Detail |
|---|---|
| Learning Objective | Build asynchronous background processing |
| Estimated Duration | 1–2 weeks |
| Skills Gained | Worker pool patterns, goroutines + channels at scale, message queue basics (e.g., Redis Streams or RabbitMQ), retry/backoff strategies |
| Related TeleMedHub Feature | Notification module (FR-24, FR-25) |
| Portfolio Milestone | Async notification dispatcher decoupled from the request/response cycle |

## Phase 9 — Medical Records Module

| Item | Detail |
|---|---|
| Learning Objective | Apply everything learned to a security-sensitive domain: strict RBAC, audit logging |
| Estimated Duration | 1 week |
| Skills Gained | Fine-grained authorization, audit-log design, structured logging |
| Related TeleMedHub Feature | Medical Records module (FR-15 to FR-17) |
| Portfolio Milestone | Records API with full access audit trail |

## Phase 10 — AI Prompt Management API

| Item | Detail |
|---|---|
| Learning Objective | Integrate external LLM APIs; design prompt templates and structured response parsing |
| Estimated Duration | 1 week |
| Skills Gained | HTTP client integration with third-party APIs, structured/JSON-mode prompting, timeout/circuit-breaker patterns |
| Related TeleMedHub Feature | AI-Assisted Diagnosis module (FR-21 to FR-23) |
| Portfolio Milestone | Triage endpoint returning structured, disclaimed AI suggestions |

## Phase 11 — Testing Deep Dive

| Item | Detail |
|---|---|
| Learning Objective | Establish testing discipline across all modules built so far |
| Estimated Duration | Ongoing, formalized in 1 week |
| Skills Gained | Table-driven tests, mocking interfaces, integration tests with test containers |
| Related TeleMedHub Feature | Cross-cutting — quality gate for entire platform |
| Portfolio Milestone | CI pipeline running unit + integration tests on every PR |

## Phase 12 — Docker & Docker Compose

| Item | Detail |
|---|---|
| Learning Objective | Containerize all services and dependencies for local/prod parity |
| Estimated Duration | 3–5 days |
| Skills Gained | Multi-stage Dockerfiles, Docker Compose networking, environment-based configuration |
| Related TeleMedHub Feature | Cross-cutting — deployment foundation |
| Portfolio Milestone | `docker-compose up` boots the entire platform locally |

## Phase 13 — gRPC (Future / Optional)

| Item | Detail |
|---|---|
| Learning Objective | Introduce internal service-to-service communication as domains are split into services |
| Estimated Duration | 1–2 weeks |
| Skills Gained | Protobuf schema design, gRPC server/client in Go, service-to-service auth |
| Related TeleMedHub Feature | Internal communication between Consultation, Wallet, Notification services |
| Portfolio Milestone | Two services communicating via gRPC instead of HTTP |

## Phase 14 — Deployment (Future / Optional)

| Item | Detail |
|---|---|
| Learning Objective | Move from Docker Compose to a more production-like deployment |
| Estimated Duration | 1–2 weeks |
| Skills Gained | Basic Kubernetes concepts or managed container platform deployment, CI/CD pipeline |
| Related TeleMedHub Feature | Cross-cutting — production readiness |
| Portfolio Milestone | Publicly accessible deployed instance with CI/CD |

---

## Roadmap Summary Table

| Phase | Module | Primary Concept |
|---|---|---|
| 0 | Fundamentals | Go basics |
| 1 | URL Shortener | REST + Postgres skeleton |
| 2 | Auth Service | JWT + RBAC |
| 3 | Booking System | Transactions & locking |
| 4 | Inventory → Orders | State machines |
| 5 | Wallet API | Financial atomicity |
| 6 | Redis | Caching |
| 7 | File Service | Object storage |
| 8 | Notification | Worker pool + queue |
| 9 | Medical Records | Fine-grained authZ |
| 10 | AI Prompt API | LLM integration |
| 11 | Testing | Quality discipline |
| 12 | Docker | Containerization |
| 13 | gRPC | Service-to-service comms |
| 14 | Deployment | Production readiness |

---

**Next document:** `03-system-architecture.md` — how these modules fit together structurally.
