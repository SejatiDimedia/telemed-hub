# 01 — Product Requirements

## 1. Product Objectives

1. Enable patients to consult doctors remotely and receive prescriptions digitally.
2. Enable doctors to manage their schedule and consultations efficiently.
3. Enable a functioning digital pharmacy order pipeline.
4. Provide a secure, auditable medical record system.
5. Provide an internal wallet for consultation/medicine payment.
6. Provide AI-assisted preliminary triage to help patients decide urgency.
7. Keep the system modular enough that each domain can be learned, built, and tested independently.
8. Provide transparent doctor quality assurance through verified patient ratings and reviews.
9. Deliver seamless real-time virtual care with in-browser WebRTC video consultations and WebSocket messaging.
10. Deliver a modern, full-width responsive web application tailored for patients, doctors, and pharmacy staff.

## 2. User Roles

| Role | Description |
|---|---|
| **Patient** | End user seeking consultation, medicine, or records access |
| **Doctor** | Licensed professional providing consultations and prescriptions |
| **Pharmacy Staff** | Fulfills and ships/tracks medicine orders |
| **Admin** | Manages users, roles, disputes, platform configuration |
| **System (AI Agent)** | Non-human actor providing triage suggestions, notifications |

## 3. User Personas

### Persona 1 — "Rina", the Patient
Lives in a semi-urban area, limited access to specialists. Wants quick answers about symptoms, wants to book a consultation without visiting a clinic, and wants medicine delivered without going to a pharmacy.

### Persona 2 — "Dr. Amir", the Doctor
Works part-time as a telemedicine consultant across multiple platforms. Needs an easy way to manage availability, view patient history during a consult, and issue prescriptions instantly.

### Persona 3 — "Sinta", Pharmacy Staff
Processes incoming prescription-based orders, updates fulfillment status, and manages inventory-adjacent order data.

### Persona 4 — "Admin Bayu"
Platform operator responsible for verifying doctor credentials, resolving disputes, and monitoring system health.

## 4. Functional Requirements

### 4.1 Identity & Access
- FR-1: Users can register/login as Patient or Doctor (self-service). Privileged roles (`pharmacy_staff`, `admin`) are assigned by an existing Admin via API.
- FR-2: JWT-based authentication with refresh tokens (access token TTL: 15 minutes; refresh token TTL: 30 days).
- FR-3: Role-based access control (RBAC) for all protected endpoints.
- FR-4: Doctors require admin verification (`is_credential_verified = true`) before being publicly bookable.
- FR-4a: A patient attempting to book an unverified doctor receives a `422 DOCTOR_NOT_VERIFIED` response.

### 4.2 Appointment & Scheduling
- FR-5: Doctors define one-off availability slots (recurring rule support in future scope).
- FR-6: Patients book available slots via atomic, locking-based reservation to prevent double-booking.
- FR-7: Either party can **cancel** an appointment. Cancellation policy:
  - If cancelled ≥ 1 hour before `scheduled_at`: full wallet refund.
  - If cancelled < 1 hour before `scheduled_at`: no refund.
  - Cutoff window is configurable via `APPOINTMENT_CANCEL_CUTOFF_MINUTES` env var.
- FR-7a: Either party can **reschedule** an appointment via a single atomic operation (cancel old slot + book new slot in one transaction). Reschedule follows the same cutoff policy as cancellation.
- FR-8: System prevents double-booking via DB-level partial unique index on `availability_id` (excluding cancelled appointments).

### 4.3 Consultation
- FR-9: A consultation session is created from a confirmed appointment.
- FR-10: Session has lifecycle states: `scheduled → in_progress → completed → (cancelled)`.
- FR-11: Doctor can attach consultation notes and issue a prescription during/after session.
- FR-11a: **Real-Time Video & Audio Conferencing**: Consultations support live peer-to-peer WebRTC video/audio communication orchestrated via WebSocket signaling hub (`GET /api/v1/consultations/{id}/ws`). Features include camera/microphone toggling, screen sharing, connection state tracking, and fallback handling.
- FR-11b: **Real-Time Persistent Chat & Collaboration**: In-room bidirectional chat messages delivered in real time via WebSocket and persisted into the database (`consultation_messages`). The room interface supports instant messaging, clinical patient summaries, diagnosis drafting, and real-time session termination broadcast.

### 4.4 Pharmacy & Orders
- FR-12: Prescriptions can be converted into a pharmacy order by the patient.
- FR-13: Pharmacy staff update order status (`pending → processing → shipped → delivered`). Cancellation is allowed before reaching `processing`.
- FR-14: Orders are linked to wallet transactions for payment (wallet charged atomically at order creation).
- FR-14a: **Inventory decrement timing**: Medicine `stock_quantity` is decremented when the order reaches `processing` status. If the order is cancelled before `processing`, stock is released back. A `CHECK (stock_quantity >= 0)` constraint enforces this at the DB level as a last resort.
- FR-14b: Stock reservation at order creation is achieved via `SELECT ... FOR UPDATE` on the `medicines` row, ensuring concurrent orders do not oversell.

### 4.5 Medical Records
- FR-15: Patients have a persistent medical record (history, allergies, prior prescriptions).
- FR-16: Only the patient, treating doctor (active/past consultation), and authorized admin can access a given record.
- FR-17: All record access (read and write) by doctor or admin is audit-logged via the shared `AuditService`.

### 4.6 Wallet
- FR-18: Patients can top up an internal wallet balance.
- FR-19: Wallet balance is deducted for consultations/orders atomically with the related transaction. Supports `Idempotency-Key` header to prevent double-charges on client retries.
- FR-20: Full transaction history is queryable by the wallet owner.

### 4.7 AI-Assisted Diagnosis
- FR-21: Patients can submit symptoms via a structured prompt. Maximum 1 active AI session per patient at a time.
- FR-22: System returns a non-authoritative triage suggestion (urgency level + suggested specialty).
- FR-23: AI suggestions are clearly labeled as non-diagnostic and stored for audit/history. Patient-identifiable information (name, ID) must **not** be included in the prompt payload sent to the external LLM.
- FR-23a: AI sessions auto-close after 24 hours of inactivity.

### 4.8 Notifications
- FR-24: System sends notifications for appointment confirmation, reminders, order status changes.
- FR-25: Notification channel is abstracted (email first; push/SMS pluggable later). Notification queue uses Redis Streams for durability — in-flight notifications survive a service restart. Failed notifications retry up to 3 times with exponential backoff.

### 4.9 Files
- FR-26: Users can upload documents (lab results, prescriptions, avatars) to object storage. Constraints: max 10 MB per file; allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`. Object keys are server-generated UUIDs — never derived from user input.
- FR-27: File access is permission-checked before serving presigned URLs. Presigned URLs expire in 15 minutes.

### 4.10 Admin
- FR-28: Admin can view/manage users, verify doctors, view audit logs, and assign privileged roles (`pharmacy_staff`, `admin`) to existing users.

### 4.11 Doctor Reviews & Reputation
- FR-29: Patients can submit a rating (1 to 5 stars) and optional feedback review for a doctor following a consultation (`POST /api/v1/consultations/{id}/review`).
- FR-30: **Review Integrity & Constraints**: Exactly one review per consultation is allowed, enforced by DB-level unique constraint (`consultation_id UNIQUE`). Only the patient of the consultation can submit a review (`403 FORBIDDEN` for other users), and reviews are only permitted once the consultation is finished (`422 UNPROCESSABLE_ENTITY` if status is not `completed`).
- FR-31: **Reputation Aggregation & Invalidation**: Creating a review atomically updates the doctor's overall `rating` (numeric 3,2) and `total_reviews` count in the `doctors` table, invalidates relevant Redis caches (e.g. doctor list), and provides public review endpoints with star rating distribution breakdown (`GET /api/v1/doctors/{id}/reviews`).

### 4.12 Frontend & User Experience
- FR-32: **Full-Width Responsive Architecture**: All portals, pages, and consultation interfaces adopt a modern full-width layout (`w-full`) to maximize workspace utilization across desktop, tablet, and mobile screens.
- FR-33: **Role-Based Portals**: Tailored web interfaces for Patients (doctor discovery, appointment booking, active consultation room, post-consultation review modals, prescription management, wallet top-up, and AI triage), Doctors (schedule management, consultation room with medical summary, prescription creation, review analytics), and Pharmacy Staff (order fulfillment and inventory updates).

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | Passwords hashed with **Argon2id** (time=1, memory=64MB, parallelism=4); JWT signed (HS256) & short-lived (15 min access / 30 day refresh); RBAC enforced at handler layer; rate limiting on sensitive endpoints; audit logging on all sensitive data access |
| **Performance** | P95 API latency < 300ms for core read endpoints under nominal load; caching (Redis) for read-heavy endpoints from Sprint 14 onward |
| **Scalability** | Stateless services; horizontal scaling supported; DB access via connection pooling (pgxpool) |
| **Reliability** | Critical flows (wallet deduction, order creation, appointment booking, review calculation) must be transactional and idempotent; notification queue durable via Redis Streams |
| **Maintainability** | Clean Architecture layering; domain logic framework-agnostic; AuditService interface for cross-module audit logging |
| **Testability** | Domain/use-case layer unit-testable without infra dependencies; repository tests use real ephemeral DB via testcontainers |
| **Observability** | Structured JSON logs via `slog`; `trace_id` propagated through `context.Context` on every request; basic metrics (latency, error rate) via `/metrics` endpoint |
| **Portability** | Fully containerized via Docker/Docker Compose; K8s-ready by design (stateless, env-config, health checks) |
| **Documentation** | API docs (OpenAPI via swaggo) updated alongside feature delivery; docs stay in sync with implemented endpoints |

## 6. MVP Scope

- Auth (Patient/Doctor registration, login, RBAC)
- Appointment booking (atomic reservation, cancellation & reschedule cutoff policies)
- Consultation session lifecycle & interactive consultation room
- Real-time WebRTC peer-to-peer video/audio calls & WebSocket persistent chat
- Doctor reviews & rating system (verified patient feedback, rating aggregation)
- Prescription issuance & pharmacy order fulfillment tracking
- Wallet top-up & atomic balance deduction with idempotency protection
- Basic medical record CRUD with audit logging
- AI-assisted preliminary triage (symptom analysis & urgency recommendation)
- Notification on key events (email channel via Redis Streams queue)
- File upload for prescriptions/documents (MinIO object storage)
- Full-width responsive React SPA frontend with dedicated portals for Patient, Doctor, and Pharmacy

## 7. Future Scope

- Recurring availability rules & calendar sync (Google Calendar / iCal)
- Multi-channel notifications (SMS/push notifications)
- gRPC internal service communication
- Insurance/claims module (BPJS / third-party payers)
- Multi-tenant support (clinics and hospital chains as tenants)
- Advanced AI diagnosis (multi-turn conversations, medical image analysis)

## 8. Assumptions

- Single-currency, single-region operation initially.
- AI diagnosis uses a third-party LLM API, not a custom-trained model.
- Payment is wallet-based (no real payment gateway) for MVP.

## 9. Constraints

- Solo developer, learning Go concurrently with building — pace and complexity must stay incremental.
- No dedicated DevOps/infra team — deployment must remain simple (Docker Compose-first).

## 10. Risks

| Risk | Mitigation |
|---|---|
| Scope creep (too many domains at once) | Strict MVP boundary; features gated behind roadmap phases |
| Learning curve on Go concurrency/idioms | Learning roadmap sequences concepts before they're required |
| AI suggestions misinterpreted as medical advice | Explicit non-diagnostic disclaimers in API responses & docs; PHI stripped from LLM prompt payloads |
| Data sensitivity (medical records) | RBAC + audit logging from day one; AuditService interface enforced across all modules touching PHI |
| Financial correctness (wallet/orders) | Idempotency keys on all financial mutations; DB `CHECK` constraints as last-resort guard; testcontainers-based concurrency tests |
| Inventory race condition | Pessimistic locking (`SELECT ... FOR UPDATE`) on medicine rows during order creation |

---

**Next document:** `02-learning-roadmap.md` — Go learning path mapped to TeleMedHub features.
