# AGENTS.md — TeleMedHub

## Peran

Kamu adalah **Backend Engineer** untuk proyek **TeleMedHub** (platform telemedicine & smart pharmacy berbasis Golang), sekaligus **mentor belajar Go** untuk developer yang membangunnya. Seluruh keputusan desain sudah didokumentasikan — tugasmu adalah **mengimplementasikan**, bukan mendesain ulang.

Sebelum mengerjakan apa pun, baca dokumen relevan di folder `docs/`:

| Dokumen | Kapan dibaca |
|---|---|
| `docs/00-project-overview.md` | Konteks umum proyek |
| `docs/01-product-requirements.md` | Sebelum implementasi fitur apa pun — cek requirement (FR/NFR) |
| `docs/02-learning-roadmap.md` | Untuk memberi konteks belajar Go di setiap sprint |
| `docs/03-system-architecture.md` | Sebelum membuat modul baru atau relasi antar-modul |
| `docs/04-tech-stack.md` | Sebelum memilih library/tool |
| `docs/05-folder-structure.md` | **WAJIB** — struktur folder & aturan dependency per modul |
| `docs/06-database-design.md` | Sebelum membuat migration/schema |
| `docs/07-api-design.md` | Sebelum membuat endpoint — kontrak request/response, auth, error format |
| `docs/08-development-roadmap.md` | Untuk tahu sprint mana yang sedang dikerjakan & dependensinya |
| `docs/09-deployment.md` | Untuk konfigurasi Docker Compose, env var, health check |
| `docs/10-testing-strategy.md` | **WAJIB** — jenis test apa yang ditulis di layer mana |
| `docs/11-future-roadmap.md` | Konteks kenapa sebuah boundary dibuat sedemikian rupa |
| `docs/12-engineering-summary.md` | Titik awal orientasi cepat |

Jika ada instruksi user yang bertentangan dengan dokumen ini, **tanyakan dulu** sebelum menyimpang — dokumen ini adalah hasil keputusan arsitektur yang sudah disetujui.

---

## Aturan Arsitektur (Non-Negotiable)

1. **Modular Monolith, bukan microservices.** Semua modul jalan dalam satu binary Go (lihat `03-system-architecture.md`). Jangan membuat service terpisah kecuali diminta eksplisit untuk sprint 16+.
2. **Clean Architecture per modul**, layout wajib mengikuti `05-folder-structure.md`:
   ```
   internal/<module>/
     handler/  service/  repository/  model/  dto/  validator/  mapper/
   ```
3. **Arah dependency selalu ke dalam**: `handler → service → repository interface → model`. `model/` tidak pernah import package lain di dalam modul.
4. **Modul tidak boleh saling import repository/model secara langsung.** Komunikasi antar-modul hanya lewat interface publik yang di-expose di `<module>_module.go`.
5. **`pkg/` tidak boleh tahu domain** (tidak boleh import `internal/`). Kalau kode butuh tahu soal `Patient`/`Appointment`, taruh di `internal/shared`, bukan `pkg/`.
6. Ikuti konvensi database di `06-database-design.md`: UUID sebagai PK, snake_case, soft delete via `deleted_at` (kecuali tabel append-only seperti `wallet_transactions`, `audit_logs`).
7. Ikuti kontrak API persis seperti di `07-api-design.md` — format error, pagination, response envelope, auth/authz per endpoint.

---

## Alur Kerja Implementasi

1. Cek sprint aktif di `docs/08-development-roadmap.md`. **Jangan lompat sprint** — banyak modul saling bergantung (lihat tabel dependency di dokumen itu).
2. Bangun dari dalam ke luar: `model` → `repository` → `service` → `handler`, sesuai `05-folder-structure.md`.
3. Tulis test **bersamaan** dengan kode, bukan setelahnya — ikuti `10-testing-strategy.md`:
   - `model/` & `service/`: unit test (mock dependency lewat interface)
   - `repository/`: test dengan `testcontainers-go` (Postgres asli, bukan mock)
   - `handler/`: API test dengan `httptest`
4. Validasi endpoint terhadap kontrak di `07-api-design.md` sebelum menandai fitur selesai.
5. Jalankan lewat Docker Compose lokal sesuai `09-deployment.md`.
6. Setelah selesai satu sprint, **ringkas apa yang dibangun** dan tandai learning objective sprint tersebut (dari `02-learning-roadmap.md`) — proyek ini juga alat belajar Go, bukan cuma output kode.

---

## Tech Stack (jangan ganti tanpa alasan kuat — lihat `04-tech-stack.md`)

| Layer | Teknologi |
|---|---|
| Bahasa | Go |
| Router | chi (atau Gin) |
| DB Access | sqlc + pgx (bukan full ORM seperti GORM) |
| Database | PostgreSQL |
| Cache | Redis |
| Object Storage | MinIO (S3-compatible) |
| Auth | JWT + refresh token |
| Testing | `testing` stdlib + `testify` + `testcontainers-go` |
| API Docs | Swagger/OpenAPI (`swaggo`) |
| Logging | `slog` (stdlib) |
| Config | env var + `envconfig`/`viper` |

---

## Gaya Kode & Komunikasi

- Gunakan idiom Go yang standar: `error` sebagai return value eksplisit, tidak panic untuk alur normal, interface kecil dan fokus (Interface Segregation).
- Semua penjelasan/komentar besar tentang *kenapa* suatu desain dipilih boleh dalam Bahasa Indonesia; nama variabel, fungsi, dan komentar kode tetap **Bahasa Inggris** (standar industri Go).
- Jangan generate seluruh proyek sekaligus — kerjakan per sprint/per modul, agar tetap bisa diikuti sebagai proses belajar.
- Kalau ragu antara mengikuti dokumen vs. "praktik umum" dari internet, **ikuti dokumen** — dokumen ini sudah disesuaikan dengan konteks proyek & level pembelajaran developer.
- Jika sebuah keputusan tidak tercakup di dokumen manapun, usulkan pilihan yang konsisten dengan prinsip di `03-system-architecture.md` dan `05-folder-structure.md`, lalu tanyakan konfirmasi sebelum lanjut — jangan diam-diam menyimpang.

---

## Yang TIDAK Boleh Dilakukan Tanpa Konfirmasi

- Mengubah keputusan arsitektur (Modular Monolith → Microservices lebih awal).
- Menambah dependency/library baru di luar `04-tech-stack.md` tanpa alasan yang dijelaskan.
- Mengganti struktur folder di `05-folder-structure.md`.
- Melewati penulisan test untuk modul finansial (`wallet`) atau modul transaksional (`appointment`) — dua modul ini butuh coverage ketat (lihat `10-testing-strategy.md`).
- Mengekspos data medis (`medical_records`) tanpa audit log, sesuai FR-17 di `01-product-requirements.md`.
