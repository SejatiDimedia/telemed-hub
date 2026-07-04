# 11 — Future Roadmap

This document describes long-term evolution paths for TeleMedHub **beyond** the 18-sprint roadmap in `08-development-roadmap.md`. None of these are committed work — they are directions the current architecture deliberately keeps open.

The recurring theme: **every item below is enabled by a decision already made in `03-system-architecture.md`, `05-folder-structure.md`, or `06-database-design.md` — not blocked by one.**

---

## 1. Mobile App

**What:** Native or cross-platform (React Native/Flutter) client for patients and doctors.

**Why the current architecture supports it:** The API layer (`07-api-design.md`) is already a clean REST/JSON contract fully decoupled from any specific client. A mobile app is simply a new consumer of the same versioned API — no backend changes required beyond possibly adding mobile-specific push notification channels to the `notification` module (already designed to be multi-channel).

## 2. Hospital Integration

**What:** Integration with hospital/clinic systems (e.g., HL7/FHIR-based record exchange).

**Why it's supported:** The `medical_records` module already isolates patient history behind its own repository interface (`05-folder-structure.md`). Adding an HL7/FHIR adapter means adding a new implementation behind that interface, or a new integration module — the domain model doesn't need to change.

## 3. Payment Gateway

**What:** Real payment processing (credit card, e-wallet, bank transfer) replacing/augmenting the internal wallet ledger.

**Why it's supported:** `wallet_transactions` (`06-database-design.md`) is already an append-only ledger with a `type` and `reference_id` — a `top_up` transaction sourced from a real gateway simply adds a new `payment_provider_reference` field and a webhook handler; the ledger/balance logic doesn't change.

## 4. Video Consultation

**What:** Real-time video between patient and doctor during a consultation.

**Why it's supported:** The `consultation` module already models session lifecycle (`scheduled → in_progress → completed`) independent of *how* the consultation happens. Adding WebRTC signaling (via a new `signaling` sub-component or a third-party SDK) attaches to the existing `consultation_id` without restructuring the domain.

## 5. Real-Time Chat

**What:** In-consultation or asynchronous messaging between patient and doctor.

**Why it's supported:** A new `chat` module can be added following the same Clean Architecture shape as every other module in `05-folder-structure.md`, referencing `consultation_id`/`user_id` — it plugs into the existing dependency rules without touching other modules.

## 6. AI Diagnosis (Advanced)

**What:** Multi-turn, image-capable diagnostic assistance beyond the MVP's text-based triage.

**Why it's supported:** The `ai` module already isolates all LLM interaction behind its own service (`01-product-requirements.md` FR-21–23). Upgrading the underlying model or adding multi-modal input is a change internal to the `ai` module's implementation — the `ai_sessions`/`ai_suggestions` schema already supports iterative, multi-message sessions.

## 7. AI Prescription Assistant

**What:** AI-assisted suggestions for dosage/drug-interaction checking during prescription issuance.

**Why it's supported:** The `prescription` module and `ai` module are already separate, interface-bound modules (`05-folder-structure.md` dependency rules). A prescription-assist feature is a new cross-module call — `prescription.service` calling `ai.Service` — using the same in-process interface pattern already established for `wallet` and `notification`.

## 8. Insurance Integration

**What:** Claims submission and coverage verification.

**Why it's supported:** Follows the same pattern as Payment Gateway — a new `insurance` module that references `orders`/`prescriptions` by ID and exposes its own interface, without requiring changes to those modules' internals.

## 9. IoT Devices

**What:** Ingesting data from wearables/home health devices (blood pressure, glucose monitors) into medical records.

**Why it's supported:** `medical_records` already supports typed entries (`record_type`, `content` as structured or free text per `06-database-design.md`) with an optional link back to a `consultation_id`. An IoT ingestion module would be a new write path into the same table, likely via a background worker (pattern already established in Sprint 13).

## 10. Public API

**What:** Exposing a subset of the API to third-party developers (e.g., partner clinics building on TeleMedHub).

**Why it's supported:** API versioning (`/api/v1/`) is already in place per `07-api-design.md`. A public-facing tier would add API-key-based authentication alongside the existing JWT auth, and a rate-limiting middleware layer — additive, not a redesign.

## 11. Analytics Dashboard

**What:** Business/operational dashboards (bookings over time, revenue, doctor utilization).

**Why it's supported:** All core events already produce durable rows (`appointments`, `wallet_transactions`, `orders`). A dashboard is a read-only reporting layer — either querying read replicas directly or, at larger scale, an event stream (see Event-Driven Architecture below) feeding a dedicated analytics store, without touching transactional tables' write path.

## 12. Service Extraction (Beyond Sprint 16)

**What:** Extracting additional modules (`wallet`, `ai`, `pharmacy`) into standalone services as load or team size demands.

**Why it's supported:** This is the core promise of the Modular Monolith decision in `03-system-architecture.md` — every module already communicates through explicit interfaces (`05-folder-structure.md` §7). Extraction is a wiring change (swap in-process implementation for a gRPC client), not a logic rewrite. Sprint 16 proves this pattern once; this item is applying it again as needed.

## 13. Microservices (Full)

**What:** A fully distributed architecture if scale genuinely requires it.

**Why it's supported — and why it's not assumed:** Every module boundary was drawn as if it were already a service boundary. The risk this roadmap deliberately avoids is adopting microservices *before* real scale or team-size pressure justifies the operational cost (`09-deployment.md` §1). This item is a **destination reachable module-by-module**, not a rewrite trigger.

## 14. Event-Driven Architecture

**What:** Replacing some direct in-process/gRPC calls with asynchronous events (e.g., `appointment.booked` → notification, analytics, and future modules all subscribe independently).

**Why it's supported:** The `notification` module already consumes "something happened" signals in a decoupled way (Sprint 10's worker pool). Formalizing this into a message broker (Kafka/RabbitMQ, flagged as future in `04-tech-stack.md`) is a natural evolution of the same pattern — publishers don't need to know their subscribers, which is already true today at the in-process level.

## 15. Kubernetes

**What:** Container orchestration for scaling and self-healing.

**Why it's supported:** `09-deployment.md` §4 lists the specific design choices (stateless services, env-based config, health check endpoints, single-image-per-service) made specifically so this is an infrastructure adoption, not an application rewrite, when the time comes.

## 16. Multi-Tenant SaaS

**What:** Supporting multiple clinics/organizations as isolated tenants on shared infrastructure.

**Why it's supported:** `03-system-architecture.md` §7 already flags the path: adding a `tenant_id` to core tables and choosing row-level vs. schema-per-tenant isolation based on real requirements at that time. Because the schema (`06-database-design.md`) already uses UUID primary keys and consistent foreign-key conventions, adding a tenant scoping column is a additive migration, not a redesign.

---

## Summary: Architecture-to-Future Mapping

| Future Capability | Enabled By (Already Built) |
|---|---|
| Mobile App | Versioned REST API, decoupled from client |
| Hospital Integration | Repository-interface isolation in `medical_records` |
| Payment Gateway | Append-only wallet ledger design |
| Video Consultation | Consultation lifecycle decoupled from delivery mechanism |
| Real-Time Chat | Modular, pluggable module pattern |
| AI Diagnosis / Prescription Assistant | Isolated `ai` module behind a service interface |
| Insurance Integration | Reference-by-ID module pattern (no tight coupling) |
| IoT Devices | Typed, extensible `medical_records` schema + worker pattern |
| Public API | Existing versioning strategy |
| Analytics Dashboard | Durable transactional tables; future event stream |
| Service Extraction / Microservices | Interface-bound modules from day one |
| Event-Driven Architecture | Existing decoupled notification pattern |
| Kubernetes | Stateless, env-configured, health-checked services |
| Multi-Tenant SaaS | Consistent UUID/FK schema conventions |

None of these require the team to "start over." That is the intended payoff of every architectural decision made across documents `03` through `07`.
