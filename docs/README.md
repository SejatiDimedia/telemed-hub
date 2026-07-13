# TeleMedHub Documentation Directory

Selamat datang di direktori dokumentasi **TeleMedHub**. Folder ini berisi seluruh dokumen keputusan arsitektur, panduan rekayasa perangkat lunak, database schema, kontrak API, dan roadmap proyek baik untuk sisi **Backend (Golang)** maupun **Frontend (React)**.

---

## 📂 Daftar Dokumen Arsitektur & Rekayasa

Di bawah ini adalah katalog lengkap dokumen keputusan desain yang wajib dipatuhi. Jangan menyimpang dari dokumen ini tanpa persetujuan tim arsitek.

### 🌐 Dokumen Backend (Golang)

| File | Judul & Deskripsi | Kapan Harus Dibaca |
|---|---|---|
| [00-project-overview.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/00-project-overview.md) | **Project Overview:** Visi platform telemedicine & smart pharmacy | Orientasi awal pengenalan proyek |
| [01-product-requirements.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/01-product-requirements.md) | **Product Requirements:** Spesifikasi Functional (FR) & Non-Functional (NFR) | Sebelum mulai membangun fitur apa pun |
| [02-learning-roadmap.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/02-learning-roadmap.md) | **Learning Roadmap:** Kurikulum belajar Go bertahap dari fundamental hingga advanced | Panduan belajar di setiap sprint |
| [03-system-architecture.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/03-system-architecture.md) | **System Architecture:** Prinsip Modular Monolith & batas domain (boundaries) | Saat merancang modul atau integrasi baru |
| [04-tech-stack.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/04-tech-stack.md) | **Tech Stack Backend:** Library & framework backend yang disetujui (sqlc, chi, pgx, slog) | Sebelum memilih/menambahkan library Go baru |
| [05-folder-structure.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/05-folder-structure.md) | **Folder Structure:** Clean architecture layout per modul & aturan dependency | **WAJIB** dipatuhi saat membuat file baru di internal/ |
| [06-database-design.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/06-database-design.md) | **Database Design:** Skema tabel SQL PostgreSQL, tipe data, indexing, & naming convention | Sebelum menulis berkas migrasi database baru |
| [07-api-design.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/07-api-design.md) | **API Design:** Kontrak endpoint request/response, format error envelope, & rate-limits | Sebelum membuat atau mengonsumsi API endpoint |
| [08-development-roadmap.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/08-development-roadmap.md) | **Development Roadmap:** Daftar 18 sprint backend teratur dari setup hingga deploy | Untuk melacak sprint backend aktif & dependensinya |
| [09-deployment.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/09-deployment.md) | **Deployment Strategy:** Konfigurasi Docker Compose lokal, env variables, & health checks | Saat mengonfigurasi startup container atau port mapping |
| [10-testing-strategy.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/10-testing-strategy.md) | **Testing Strategy:** Aturan penulisan unit, integration (testcontainers), & API tests | **WAJIB** dibaca saat menulis unit test modul baru |
| [11-future-roadmap.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/11-future-roadmap.md) | **Future Roadmap:** Perencanaan service extraction (gRPC) & WebRTC | Rujukan masa depan untuk skalabilitas sistem |
| [12-engineering-summary.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/12-engineering-summary.md) | **Engineering Summary:** Lembar fakta cepat (cheat sheet) untuk orientasi developer baru | Titik awal orientasi rekayasa backend |
| [13-authentication.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/13-authentication.md) | **Authentication Strategy:** Penjelasan alur JWT, refresh token, & RBAC | Sebelum mengutak-atik otorisasi endpoint |

### 🖥️ Dokumen Frontend (React/TypeScript)

| File | Judul & Deskripsi | Kapan Harus Dibaca |
|---|---|---|
| [14-frontend-overview.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/14-frontend-overview.md) | **Frontend Overview:** Scope portal terintegrasi (Pasien, Dokter, Apotek, Admin) | Pengenalan scope aplikasi web |
| [15-frontend-tech-stack.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/15-frontend-tech-stack.md) | **Tech Stack Frontend:** Library frontend yang disetujui (Vite, Router/Query, Zustand, Zod) | Sebelum menambahkan package npm baru |
| [16-frontend-architecture.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/16-frontend-architecture.md) | **Frontend Architecture:** Alur data server state (Query) vs UI state, route guards, & auth | Sebelum memprogram data flow / interaksi token |
| [17-frontend-folder-structure.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/17-frontend-folder-structure.md) | **Folder Structure:** Layout feature-based folder di web/src/ & larangan import silang | **WAJIB** dipatuhi saat merancang file baru di web/src/ |
| [18-frontend-roadmap.md](file:///Users/timurdianradhasejati/Programming/Code/Golang/telemed_hub/docs/18-frontend-roadmap.md) | **Frontend Roadmap:** Rencana pengembangan frontend MVP dalam 7 sprint terfokus | Acuan sprint aktif untuk portal klien frontend |

---

## 🛠️ Aturan Komunikasi & Gaya Kode (Lintas-Domain)

1.  **Bahasa Penulisan:**
    *   **Penjelasan/Komentar Besar:** Bahasa Indonesia (untuk mempermudah pemahaman arsitektur).
    *   **Kode Program:** Bahasa Inggris (nama variabel, fungsi, database field, class, method).
2.  **Modularitas Tanpa Kompromi:**
    *   **Backend:** Domain tidak boleh saling import model/repository secara langsung. Lakukan lewat interface publik di `module.go`.
    *   **Frontend:** Fitur tidak boleh melakukan import komponen atau hooks milik fitur lain secara langsung. Naikkan data flow ke level page routing.
3.  **Keamanan Sesi:**
    *   Access Token disimpan hanya di memori.
    *   Refresh Token disimpan secara aman di `localStorage` (sebagai fallback browser session).
