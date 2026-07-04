# 00 — Project Overview

## TeleMedHub
**AI-Powered Telemedicine & Smart Pharmacy Platform**

---

## 1. Vision

TeleMedHub aims to be a cloud-native platform that makes quality healthcare accessible remotely — combining doctor consultations, digital pharmacy, medical records, and AI-assisted triage into a single coherent product, built the way a real engineering team would build it: incrementally, with documentation-first discipline, clean architecture, and production-grade practices from day one.

For its creator, TeleMedHub is also a **structured Golang learning vehicle** — every backend concept learned (interfaces, concurrency, transactions, caching, messaging, gRPC) is applied to a real feature rather than a toy exercise.

## 2. Problem Statement

Patients — especially in underserved or remote areas — face:
- Long wait times for in-person consultations
- Difficulty accessing prescribed medication quickly
- Fragmented medical history across providers
- No easy way to get a fast, preliminary read on symptoms before deciding whether a doctor visit is necessary

Clinics and independent doctors, meanwhile, lack affordable, well-integrated software to run virtual consultations, manage schedules, and dispense/track prescriptions digitally.

## 3. Solution Overview

TeleMedHub provides a unified backend platform with these capabilities:

| Capability | Description |
|---|---|
| Online Consultation | Chat/video-based doctor-patient consultation |
| Appointment Scheduling | Booking, rescheduling, availability management |
| Digital Pharmacy | Prescription issuance, order, and fulfillment tracking |
| Medical Records | Secure, structured patient history storage |
| Digital Wallet | In-app balance for paying consultations/medicine |
| AI-Assisted Diagnosis | Preliminary symptom triage via LLM-based prompts |
| Notifications | Multi-channel (email/push/SMS-ready) alerts |
| Admin & Ops | Role management, auditing, platform configuration |

## 4. Target Users

| User Type | Needs |
|---|---|
| Patient | Book consultations, get prescriptions, track orders, view history |
| Doctor | Manage schedule, conduct consultations, issue prescriptions |
| Pharmacy Admin | Fulfill and track medicine orders |
| Platform Admin | Manage users, roles, platform health, disputes |
| (Future) Insurance Partner | Claims integration |

## 5. Business Goals

- Deliver a working MVP that demonstrates a realistic multi-domain SaaS backend.
- Produce a portfolio-grade project showcasing Clean Architecture in Go.
- Build re-usable domain modules (wallet, notifications, auth, files) that could plausibly seed a real startup.
- Learn and demonstrate production concerns: security, observability, testability, scalability.

## 6. Core Modules

1. **Identity & Access** — auth, roles, permissions
2. **Appointment & Scheduling**
3. **Consultation** — chat/video session metadata, notes
4. **Pharmacy & Orders**
5. **Medical Records**
6. **Wallet & Payments**
7. **AI Assistant** — symptom intake, triage suggestions
8. **Notification**
9. **File/Media Management** — documents, prescriptions, avatars
10. **Admin/Platform Management**

## 7. High-Level Feature List

- Patient & doctor registration/authentication (JWT-based)
- Doctor availability & appointment booking
- Consultation session lifecycle (scheduled → in-progress → completed)
- Digital prescription issuance
- Pharmacy order placement & fulfillment tracking
- Wallet top-up, deduction, transaction history
- Medical record CRUD with access control
- AI-assisted preliminary diagnosis suggestions (non-authoritative)
- Notification dispatch (appointment reminders, order status, etc.)
- File upload/storage (prescriptions, lab results, avatars)
- Admin dashboard APIs (user management, audit logs)

## 8. Success Criteria

| Criteria | Definition of Done |
|---|---|
| Functional MVP | Core flows (booking → consultation → prescription → order) work end-to-end |
| Clean Architecture | Domains are decoupled; business logic has no framework/infra dependency |
| Test Coverage | Core domain logic covered by unit tests; critical flows have integration tests |
| Observability | Structured logging + basic metrics in place |
| Documentation Parity | Docs stay in sync with implemented features |
| Learning Outcomes | Each roadmap module maps to a shipped feature |

## 9. Project Scope

**In scope (MVP → V1):**
- Core domains listed above
- REST API (gRPC introduced later for internal service-to-service calls)
- Single-region deployment via Docker Compose (Kubernetes-ready design, not required initially)
- Basic AI integration via external LLM API (not building/training models)

## 10. Out of Scope

- Real payment gateway integration (wallet is simulated/internal ledger initially)
- Real video/audio infrastructure (WebRTC signaling is stubbed/metadata-only initially)
- Multi-region / multi-tenant infrastructure
- Native mobile apps
- Regulatory certification (HIPAA/GDPR full compliance) — architecture will be *compliance-aware*, not certified
- Insurance claims processing

---

**Next document:** `01-product-requirements.md` — detailed functional/non-functional requirements, roles, and MVP boundaries.
