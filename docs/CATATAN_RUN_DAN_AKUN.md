# Panduan Menjalankan TeleMedHub & Daftar Akun

Dokumen ini berisi panduan lengkap untuk menjalankan TeleMedHub (Backend & Frontend) secara lokal serta daftar akun pengujian (credentials).

---

## 1. Daftar Akun & Password

Semua akun bawaan sistem menggunakan **password yang sama**:

```text
Rahasia123!
```

### Tabel Akun Berdasarkan Role

| Role | Email | Password | Nama Pengguna | Akses Fitur Utama |
|---|---|---|---|---|
| **Patient** | `timur@telemedhub.com` | `Rahasia123!` | timur radhadian | Booking Dokter, Konsultasi, Resep, Top-up Saldo / Wallet |
| **Doctor** | `dr.alice@telemedhub.com` | `Rahasia123!` | Dr. Alice Smith | Dashboard Dokter, Kelola Jadwal, Sesi Konsultasi, Buat Resep |
| **Doctor** | `andi@telemedhub.com` | `Rahasia123!` | Dr. Andi Pratama | Dokter Umum (General Practitioner) |
| **Doctor** | `budi@telemedhub.com` | `Rahasia123!` | Dr. Budi Santoso | Spesialis Jantung (Cardiologist) |
| **Doctor** | `citra@telemedhub.com` | `Rahasia123!` | Dr. Citra Lestari | Spesialis Anak (Pediatrician) |
| **Doctor** | `dina@telemedhub.com` | `Rahasia123!` | Dr. Dina Wijaya | Spesialis Kulit (Dermatologist) |
| **Doctor** | `eko@telemedhub.com` | `Rahasia123!` | Dr. Eko Prasetyo | Spesialis Saraf (Neurologist) |
| **Pharmacy Staff** | `sinta@telemedhub.com` | `Rahasia123!` | Sinta Pharmacy | Verifikasi & Pemrosesan Resep Obat, Manajemen Stok Farmasi |
| **Pharmacy Staff** | `rehan@telemedhub.com` | `Rahasia123!` | Rehan Apoteker | Pengelolaan Pesanan Obat & Inventaris |
| **Admin** | `admin@telemedhub.com` | `Rahasia123!` | Admin Bayu | Verifikasi Kredensial Dokter, Manajemen Pengguna, Log Audit Keamanan |

---

## 2. Alamat & Port Layanan

| Layanan | URL / Port | Keterangan |
|---|---|---|
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Aplikasi Web TeleMedHub (Vite + React) |
| **Halaman Login** | [http://localhost:5173/login](http://localhost:5173/login) | Halaman masuk aplikasi |
| **Backend API** | [http://localhost:8080](http://localhost:8080) | Go Chi REST API |
| **Health Check (Liveness)** | [http://localhost:8080/healthz](http://localhost:8080/healthz) | Status aktif server API |
| **Readiness Check** | [http://localhost:8080/readyz](http://localhost:8080/readyz) | Cek koneksi DB, Redis, dan MinIO |
| **Metrics** | [http://localhost:8080/metrics](http://localhost:8080/metrics) | Metrik Prometheus |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | Dashboard Object Storage (User: `minioadmin`, Pass: `minioadmin_secret`) |
| **PostgreSQL** | `localhost:5432` | Database utama (`telemedhub`) |
| **Redis** | `localhost:6379` | Cache & token blacklist |

---

## 3. Langkah Menjalankan Aplikasi

Pastikan Docker Desktop sudah menyala di perangkat Anda.

### Cara 1: Menggunakan Docker Compose (Direkomendasikan untuk Semua Servis)

Jalankan perintah berikut di root folder project:

```bash
# 1. Jalankan semua container (PostgreSQL, Redis, MinIO, dan API backend)
docker compose -f deployments/docker-compose.yml up -d

# 2. Jalankan frontend di terminal baru
cd web
npm run dev
```

---

### Cara 2: Hybrid (Infrastruktur di Docker + Backend & Frontend Lokal)

Jika Anda ingin menjalankan backend Go langsung dari terminal lokal untuk kemudahan debugging:

#### A. Jalankan Infrastruktur (PostgreSQL, Redis, MinIO)
```bash
docker compose -f deployments/docker-compose.yml up -d postgres redis minio
```

#### B. Pastikan Database & Migrasi Terpasang
```bash
# Jalankan migrasi database
./scripts/migrate.sh up

# (Opsional) Jika database kosong dan perlu data awal dokter/spesialis:
go run scripts/seed.go
```

#### C. Jalankan Backend Go
Pastikan konfigurasi di `.env` sudah mengarah ke `localhost`:
```bash
DATABASE_URL=postgres://telemedhub:telemedhub_secret@localhost:5432/telemedhub?sslmode=disable
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
```
Lalu jalankan server API:
```bash
go run ./cmd/api
```

#### D. Jalankan Frontend Web
Buka terminal baru:
```bash
cd web
npm install # jika dependensi belum diinstall
npm run dev
```

---

## 4. Perintah Berguna Lainnya

### Melihat Log Backend
```bash
# Jika API jalan via Docker:
docker logs -f telemedhub_api

# Cek container yang sedang berjalan:
docker ps
```

### Menghentikan Semua Layanan Docker
```bash
docker compose -f deployments/docker-compose.yml down
```

### Memeriksa Kesiapan Server API
```bash
curl http://localhost:8080/readyz
```
Respon sukses:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "checks": {
      "postgres": "ok",
      "redis": "ok",
      "minio": "ok"
    }
  }
}
```
