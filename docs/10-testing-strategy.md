# 10 — Testing Strategy

## 1. Testing Philosophy

Tests exist to protect the two things this project cannot afford to get wrong: **correctness of transactional business logic** (bookings, wallet, orders) and **confidence to refactor** while learning Go. Testing is not a separate phase — it is written *alongside* each sprint in `08-development-roadmap.md`, not after.

Guiding rule: **test business logic thoroughly, test framework glue lightly.** The Clean Architecture layering from `05-folder-structure.md` makes this natural — `model/` and `service/` deserve rigorous unit tests; `handler/` needs only enough testing to confirm wiring is correct.

---

## 2. Test Types

### 2.1 Unit Tests

**What:** `model/` (domain rules) and `service/` (use cases), with all dependencies (repositories, other modules) mocked via interfaces.

**When written:** Immediately alongside the code, same commit/PR. Never deferred.

**Example targets:**
- `Appointment.CanBeCancelled()` — pure domain rule, no mocks needed.
- `AppointmentService.Book()` — mocked repository + mocked wallet interface, verifying the correct calls happen in the correct order and errors propagate correctly.

**Tooling:** Go stdlib `testing` + `testify/assert` and `testify/mock`.

### 2.2 Repository Tests

**What:** Real database interactions — verifying SQL/`sqlc`-generated queries behave correctly against an actual PostgreSQL instance (constraints, transactions, locking).

**When written:** Whenever a repository method is added or a migration changes schema — these tests catch things unit tests with mocks cannot (e.g., a unique constraint actually preventing double-booking).

**Tooling:** `testcontainers-go` spins up a real, ephemeral PostgreSQL container per test run — no shared test database, no order-dependent test pollution.

### 2.3 Integration Tests

**What:** Multiple modules working together through their real (non-mocked) implementations — e.g., "booking an appointment actually deducts the wallet and creates a consultation record."

**When written:** After the individual modules involved have their own unit + repository tests passing — integration tests confirm the *wiring*, not re-verify each module's internal logic.

**Location:** `test/integration/`, run against `testcontainers`-provisioned Postgres/Redis, separate from per-module unit tests.

### 2.4 API Tests

**What:** End-to-end HTTP-level tests hitting real handler routes (in-process `httptest.Server`), verifying request validation, status codes, and response shapes match `07-api-design.md`.

**When written:** Once a module's handler layer is complete, before marking the sprint's feature "done."

**Tooling:** Go stdlib `net/http/httptest`.

---

## 3. Mock Strategy

- Every cross-boundary dependency (repository interfaces, other modules' public service interfaces, external clients like the LLM API) is defined as a **Go interface** — this is what makes mocking possible without a heavy DI framework.
- Mocks are generated or hand-written using `testify/mock`; for small interfaces, hand-written fakes are preferred for readability.
- **Never mock the database in repository tests** — that defeats their purpose. Mocks are for unit tests only; repository tests always hit a real (ephemeral) database.
- External services (LLM API, email provider) are always mocked/stubbed in tests — no test should make a real external network call.

---

## 4. Test Coverage Requirements per Module

| Module | Min Unit Coverage | Integration Required? | Special Notes |
|---|---|---|---|
| `auth` | 80% | Yes (login, refresh, logout) | Token revocation path must be covered |
| `user` | 70% | No | |
| `doctor` | 70% | No | Verify endpoint requires admin role assertion test |
| `patient` | 70% | No | |
| `appointment` | 90% | Yes | **Double-booking concurrency test required** (two goroutines booking the same slot simultaneously; one must fail with `SLOT_ALREADY_BOOKED`); cancellation refund policy (within cutoff vs. outside cutoff) |
| `consultation` | 80% | No | State machine transitions |
| `prescription` | 80% | No | Requires mock of `consultation.Service` |
| `pharmacy/inventory` | 85% | Yes | **Stock oversell concurrency test required** (two goroutines ordering the last item simultaneously; one must fail with `OUT_OF_STOCK`); order lifecycle state transitions |
| `wallet` | 90% | Yes | **Idempotency test required** (same `Idempotency-Key` twice must return same transaction, not create duplicate); balance atomicity (concurrent top-up/deduction); append-only ledger consistency |
| `medical_records` | 85% | No | `AuditService.Log` called on every read/write (verify via mock assertions) |
| `ai` | 70% | No | PHI-stripping logic: assert that patient name/ID not in LLM-sent payload |
| `notification` | 75% | Yes | **Durability test:** Redis Streams consumer processes a notification after worker restart; retry logic (up to 3 attempts with backoff) |
| `file` | 70% | Yes | File size/MIME validation; presigned URL generation (MinIO testcontainer) |
| `admin` | 75% | No | Role assignment requires audit log entry (verify via mock `AuditService`) |
| `shared` | 85% | No | `AuditService` concrete impl; RBAC middleware; `Money` value object arithmetic |

Coverage is reported in CI (Sprint 1 onward) but a dip is a *conversation*, not an automatic build failure, except for `wallet` and `appointment` modules where financial/booking correctness makes strict enforcement worthwhile.

---

## 5. Folder Organization

```
internal/<module>/
├── model/
│   ├── appointment.go
│   └── appointment_test.go        # unit test, same package
├── service/
│   ├── appointment_service.go
│   └── appointment_service_test.go # unit test, mocked deps
├── repository/
│   ├── postgres_appointment_repo.go
│   └── postgres_appointment_repo_test.go # repository test, testcontainers
├── handler/
│   ├── appointment_handler.go
│   └── appointment_handler_test.go # API test, httptest

test/
├── integration/
│   └── booking_flow_test.go        # cross-module integration test
└── fixtures/
    └── seed_data.go                # shared test data builders
```

**Rule:** unit/repository/handler tests live beside the code they test (standard Go convention, keeps context close). Only genuinely cross-module integration tests live under top-level `test/`.

---

## 6. Testing Workflow (Per Sprint)

1. Write/adjust the `model/` domain logic → write its unit test in the same PR.
2. Write the `repository/` implementation → write its repository test (testcontainers) in the same PR.
3. Write the `service/` use case (mocking repository + any cross-module interfaces) → unit test with mocks.
4. Write the `handler/` → API test covering success + primary error cases from `07-api-design.md`.
5. If the sprint's feature spans modules (e.g., Sprint 4 Appointment touching Wallet), add one integration test in `test/integration/` covering the full flow.
6. CI runs unit + repository + API tests on every push; integration tests run on merge to `main` (per `09-deployment.md`).

This order matches the natural inside-out build order of Clean Architecture itself — you're never testing a layer before the layer beneath it exists.

---

## 7. Best Practices

- **Table-driven tests** for anything with multiple input/output cases (Go idiom — use it from Sprint 0).
- **Arrange-Act-Assert** structure in every test for readability.
- **No shared mutable test state** between tests — each test sets up its own fixtures.
- **Deterministic tests only** — no reliance on real time (`time.Now()`) or real randomness without injecting a fake clock/seed.
- **Test names describe behavior, not implementation:** `Test_Book_FailsWhenSlotAlreadyBooked`, not `Test_Book_2`.
- **Fail fast on flaky tests** — a flaky test in `wallet` or `appointment` is treated as a bug, not "just retry CI."
- **Don't test the framework** — no need to test that `chi` routes correctly; test that *your handler* behaves correctly when routed to.

---

**Next document:** `11-future-roadmap.md` — long-term evolution of TeleMedHub.
