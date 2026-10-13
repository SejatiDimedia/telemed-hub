package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	authmodel "github.com/timurdianradhasejati/telemed_hub/internal/auth/model"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://telemedhub:telemedhub_secret@localhost:5432/telemedhub?sslmode=disable"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("🚀 Memulai proses seeding Showcase Portfolio TeleMedHub...")

	// Common password hash for 'Rahasia123!' using Argon2id (system standard)
	rawPassword := "Rahasia123!"
	hashedPassword, err := authmodel.HashPassword(rawPassword)
	if err != nil {
		log.Fatalf("Failed to hash password with Argon2id: %v", err)
	}

	// =========================================================================
	// 1. Seed Specialties
	// =========================================================================
	fmt.Println("👉 [1/12] Seeding Medical Specialties...")
	specialtiesData := []struct {
		Name        string
		Icon        string
		Description string
	}{
		{
			Name:        "Spesialis Penyakit Dalam",
			Icon:        "vital_signs",
			Description: "Menangani diagnosis dan terapi komprehensif penyakit organ dalam dewasa, infeksi tropis, diabetes, hipertensi, dan autoimun.",
		},
		{
			Name:        "Spesialis Anak (Pediatri)",
			Icon:        "child_care",
			Description: "Pelayanan kesehatan menyeluruh untuk bayi, anak-anak, dan remaja, mencakup tumbuh kembang, imunisasi, dan penyakit infeksi anak.",
		},
		{
			Name:        "Spesialis Jantung & Pembuluh Darah",
			Icon:        "cardiology",
			Description: "Pencegahan, diagnosis medis, dan pengelolaan penyakit kardiovaskular, sindrom koroner, aritmia, dan hipertensi sekunder.",
		},
		{
			Name:        "Spesialis Neurologi (Saraf)",
			Icon:        "neurology",
			Description: "Perawatan komprehensif kelainan sistem saraf pusat dan perifer, stroke, vertigo, migrain akut, neuropati, dan epilepsi.",
		},
		{
			Name:        "Dokter Umum (General Practitioner)",
			Icon:        "stethoscope",
			Description: "Konsultasi kesehatan primer, skrining awal gejala klinis, penanganan keluhan medis harian, dan rekomendasi rujukan terarah.",
		},
	}

	specialtyIDs := make(map[string]uuid.UUID)
	for _, s := range specialtiesData {
		var id uuid.UUID
		err := pool.QueryRow(ctx, `
			INSERT INTO specialties (name, image_icon, description, created_at, updated_at)
			VALUES ($1, $2, $3, NOW(), NOW())
			ON CONFLICT (name) DO UPDATE SET 
				image_icon = EXCLUDED.image_icon,
				description = EXCLUDED.description,
				updated_at = NOW()
			RETURNING id
		`, s.Name, s.Icon, s.Description).Scan(&id)
		if err != nil {
			log.Fatalf("Error inserting specialty %s: %v", s.Name, err)
		}
		specialtyIDs[s.Name] = id
	}

	// Fetch role IDs
	roleIDs := make(map[string]uuid.UUID)
	roleNames := []string{"patient", "doctor", "pharmacy_staff", "admin"}
	for _, rName := range roleNames {
		var rID uuid.UUID
		err := pool.QueryRow(ctx, "SELECT id FROM roles WHERE name = $1", rName).Scan(&rID)
		if err != nil {
			log.Fatalf("Failed to query role %s: %v", rName, err)
		}
		roleIDs[rName] = rID
	}

	// =========================================================================
	// 2. Seed Users & User Roles
	// =========================================================================
	fmt.Println("👉 [2/12] Seeding Users & Roles (Patient, Doctors, Pharmacist, Admin)...")
	type UserSeed struct {
		Email     string
		FullName  string
		Phone     string
		Role      string
		Avatar    string
		Verified  bool
		Status    string
	}

	usersList := []UserSeed{
		// 1. Anchor Patient
		{
			Email:    "timur@telemedhub.com",
			FullName: "Timur Dian Radhasejati",
			Phone:    "+6281234567890",
			Role:     "patient",
			Avatar:   "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 2. Patient 2 (For doctor queue)
		{
			Email:    "anisa@telemedhub.com",
			FullName: "Anisa Rahmawati",
			Phone:    "+6281277665544",
			Role:     "patient",
			Avatar:   "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 3. Patient 3
		{
			Email:    "bambang@telemedhub.com",
			FullName: "Bambang Hermanto",
			Phone:    "+6281288776655",
			Role:     "patient",
			Avatar:   "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 4. Anchor Doctor (Internist)
		{
			Email:    "andi@telemedhub.com",
			FullName: "dr. Andi Pratama, Sp.PD",
			Phone:    "+6281122334455",
			Role:     "doctor",
			Avatar:   "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 5. Doctor 2 (Pediatrician)
		{
			Email:    "sarah@telemedhub.com",
			FullName: "dr. Sarah Wijaya, Sp.A",
			Phone:    "+6281133445566",
			Role:     "doctor",
			Avatar:   "https://images.unsplash.com/photo-1594824813511-28562777174e?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 6. Doctor 3 (Cardiologist)
		{
			Email:    "budi@telemedhub.com",
			FullName: "dr. Budi Setiawan, Sp.JP(K)",
			Phone:    "+6281144556677",
			Role:     "doctor",
			Avatar:   "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 7. Doctor 4 (Neurologist - PENDING VERIFICATION for Admin showcase!)
		{
			Email:    "hendra@telemedhub.com",
			FullName: "dr. Hendra Wijaya, Sp.N",
			Phone:    "+6281155667788",
			Role:     "doctor",
			Avatar:   "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 8. Pharmacy Staff
		{
			Email:    "sinta@telemedhub.com",
			FullName: "Apt. Sinta Permatasari, S.Farm",
			Phone:    "+6281299887766",
			Role:     "pharmacy_staff",
			Avatar:   "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
		// 9. Admin
		{
			Email:    "admin@telemedhub.com",
			FullName: "Administrator Medis",
			Phone:    "+6281200001111",
			Role:     "admin",
			Avatar:   "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
			Verified: true,
			Status:   "active",
		},
	}

	userIDs := make(map[string]uuid.UUID)
	for _, u := range usersList {
		var uID uuid.UUID
		err := pool.QueryRow(ctx, `
			INSERT INTO users (email, phone_number, password_hash, full_name, is_verified, status, profile_picture_url, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
			ON CONFLICT (email) DO UPDATE SET
				phone_number = EXCLUDED.phone_number,
				full_name = EXCLUDED.full_name,
				password_hash = EXCLUDED.password_hash,
				is_verified = EXCLUDED.is_verified,
				status = EXCLUDED.status,
				profile_picture_url = EXCLUDED.profile_picture_url,
				updated_at = NOW()
			RETURNING id
		`, u.Email, u.Phone, hashedPassword, u.FullName, u.Verified, u.Status, u.Avatar).Scan(&uID)
		if err != nil {
			log.Fatalf("Error inserting user %s: %v", u.Email, err)
		}
		userIDs[u.Email] = uID

		// Link role
		roleID := roleIDs[u.Role]
		_, err = pool.Exec(ctx, `
			INSERT INTO user_roles (user_id, role_id)
			VALUES ($1, $2)
			ON CONFLICT (user_id, role_id) DO NOTHING
		`, uID, roleID)
		if err != nil {
			log.Fatalf("Error linking role for user %s: %v", u.Email, err)
		}
	}

	// =========================================================================
	// 3. Seed Patient Profiles & Wallets
	// =========================================================================
	fmt.Println("👉 [3/12] Seeding Patient Profiles & Digital Wallets...")
	patientProfiles := []struct {
		Email     string
		DoB       string
		Gender    string
		BloodType string
		Balance   float64
	}{
		{"timur@telemedhub.com", "1998-05-15", "male", "O+", 725000.00},
		{"anisa@telemedhub.com", "1995-09-20", "female", "B+", 350000.00},
		{"bambang@telemedhub.com", "1987-11-12", "male", "A+", 120000.00},
	}

	patientIDs := make(map[string]uuid.UUID)
	walletIDs := make(map[string]uuid.UUID)
	for _, p := range patientProfiles {
		uID := userIDs[p.Email]
		var patID uuid.UUID
		err := pool.QueryRow(ctx, `
			INSERT INTO patients (user_id, date_of_birth, gender, blood_type, created_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (user_id) DO UPDATE SET
				date_of_birth = EXCLUDED.date_of_birth,
				gender = EXCLUDED.gender,
				blood_type = EXCLUDED.blood_type,
				updated_at = NOW()
			RETURNING id
		`, uID, p.DoB, p.Gender, p.BloodType).Scan(&patID)
		if err != nil {
			log.Fatalf("Error inserting patient for %s: %v", p.Email, err)
		}
		patientIDs[p.Email] = patID

		// Wallet
		var wID uuid.UUID
		err = pool.QueryRow(ctx, `
			INSERT INTO wallets (patient_id, balance, created_at, updated_at)
			VALUES ($1, $2, NOW(), NOW())
			ON CONFLICT (patient_id) DO UPDATE SET
				balance = EXCLUDED.balance,
				updated_at = NOW()
			RETURNING id
		`, patID, p.Balance).Scan(&wID)
		if err != nil {
			log.Fatalf("Error creating wallet for %s: %v", p.Email, err)
		}
		walletIDs[p.Email] = wID
	}

	// Ledger transactions for Timur's wallet
	timurWalletID := walletIDs["timur@telemedhub.com"]
	_, _ = pool.Exec(ctx, "DELETE FROM wallet_transactions WHERE wallet_id = $1", timurWalletID)
	walletTxSeeds := []struct {
		Type         string
		Amount       float64
		BalanceAfter float64
		Idempotency  string
		CreatedAgo   time.Duration
	}{
		{"top_up", 1000000.00, 1000000.00, "idem-topup-001", 3 * 24 * time.Hour},
		{"consultation_payment", 150000.00, 850000.00, "idem-cons-001", 2 * 24 * time.Hour},
		{"order_payment", 125000.00, 725000.00, "idem-order-001", 1 * 24 * time.Hour},
	}
	for _, tx := range walletTxSeeds {
		_, err = pool.Exec(ctx, `
			INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, idempotency_key, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, timurWalletID, tx.Type, tx.Amount, tx.BalanceAfter, tx.Idempotency, time.Now().Add(-tx.CreatedAgo))
		if err != nil {
			log.Fatalf("Error inserting wallet transaction: %v", err)
		}
	}

	// =========================================================================
	// 4. Seed Doctors & Doctor Profiles
	// =========================================================================
	fmt.Println("👉 [4/12] Seeding Doctor Profiles (Specialties, SIP/STR, Fees, Ratings)...")
	doctorSeeds := []struct {
		Email        string
		Specialty    string
		License      string
		Fee          float64
		Verified     bool
		Rating       float64
		TotalReviews int
	}{
		{
			Email:        "andi@telemedhub.com",
			Specialty:    "Spesialis Penyakit Dalam",
			License:      "SIP-3171/08.2023/IDI-JKT",
			Fee:          150000.00,
			Verified:     true,
			Rating:       4.95,
			TotalReviews: 18,
		},
		{
			Email:        "sarah@telemedhub.com",
			Specialty:    "Spesialis Anak (Pediatri)",
			License:      "SIP-3172/11.2022/IDAI-JKT",
			Fee:          175000.00,
			Verified:     true,
			Rating:       4.85,
			TotalReviews: 12,
		},
		{
			Email:        "budi@telemedhub.com",
			Specialty:    "Spesialis Jantung & Pembuluh Darah",
			License:      "SIP-3173/04.2021/PERKI-JKT",
			Fee:          250000.00,
			Verified:     true,
			Rating:       4.95,
			TotalReviews: 24,
		},
		{
			Email:        "hendra@telemedhub.com",
			Specialty:    "Spesialis Neurologi (Saraf)",
			License:      "SIP-3174/09.2024/PERDOSSI-JKT",
			Fee:          180000.00,
			Verified:     false, // Showcase for Admin doctor verification!
			Rating:       0.0,
			TotalReviews: 0,
		},
	}

	doctorIDs := make(map[string]uuid.UUID)
	for _, doc := range doctorSeeds {
		uID := userIDs[doc.Email]
		specID := specialtyIDs[doc.Specialty]
		var dID uuid.UUID
		err := pool.QueryRow(ctx, `
			INSERT INTO doctors (user_id, specialty_id, license_number, is_credential_verified, consultation_fee, rating, total_reviews, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
			ON CONFLICT (user_id) DO UPDATE SET
				specialty_id = EXCLUDED.specialty_id,
				license_number = EXCLUDED.license_number,
				is_credential_verified = EXCLUDED.is_credential_verified,
				consultation_fee = EXCLUDED.consultation_fee,
				rating = EXCLUDED.rating,
				total_reviews = EXCLUDED.total_reviews,
				updated_at = NOW()
			RETURNING id
		`, uID, specID, doc.License, doc.Verified, doc.Fee, doc.Rating, doc.TotalReviews).Scan(&dID)
		if err != nil {
			log.Fatalf("Error inserting doctor for %s: %v", doc.Email, err)
		}
		doctorIDs[doc.Email] = dID
	}

	// =========================================================================
	// 5. Seed Medicines & Catalog
	// =========================================================================
	fmt.Println("👉 [5/12] Seeding Authentic Pharmacy Medicines & Inventory...")
	type MedicineSeed struct {
		Name                 string
		UnitPrice            float64
		Stock                int
		RequiresPrescription bool
	}

	medicinesData := []MedicineSeed{
		{"Sanmol Forte Sirup 60ml (Paracetamol 250mg/5ml)", 38500.00, 120, false},
		{"Paracetamol 500mg Strip 10 Tablet", 6500.00, 450, false},
		{"Cefixime Trihydrate 100mg Box 30 Kapsul", 32000.00, 85, true},
		{"Cetirizine HCl 10mg Box 30 Tablet", 18000.00, 210, false},
		{"Omeprazole 20mg Kapsul Strip 10", 16500.00, 140, true},
		{"Amoxicillin Clavulanate 625mg Box 30", 88000.00, 45, true},
		{"Betahistine Mesilate 6mg Strip 10 Tablet", 24000.00, 95, true},
		{"Imboost Force Sirup 120ml Multivitamin", 76000.00, 60, false},
	}

	medicineIDs := make(map[string]uuid.UUID)
	for _, med := range medicinesData {
		var mID uuid.UUID
		err := pool.QueryRow(ctx, "SELECT id FROM medicines WHERE name = $1 AND deleted_at IS NULL LIMIT 1", med.Name).Scan(&mID)
		if err == nil {
			// Update existing
			_, err = pool.Exec(ctx, `
				UPDATE medicines SET
					unit_price = $1,
					stock_quantity = $2,
					requires_prescription = $3,
					updated_at = NOW()
				WHERE id = $4
			`, med.UnitPrice, med.Stock, med.RequiresPrescription, mID)
			if err != nil {
				log.Fatalf("Error updating medicine %s: %v", med.Name, err)
			}
		} else {
			// Insert new
			err = pool.QueryRow(ctx, `
				INSERT INTO medicines (name, unit_price, stock_quantity, requires_prescription, created_at, updated_at)
				VALUES ($1, $2, $3, $4, NOW(), NOW())
				RETURNING id
			`, med.Name, med.UnitPrice, med.Stock, med.RequiresPrescription).Scan(&mID)
			if err != nil {
				log.Fatalf("Error inserting medicine %s: %v", med.Name, err)
			}
		}
		medicineIDs[med.Name] = mID
	}

	// =========================================================================
	// 6. Seed Doctor Availability (Today, Tomorrow, Day After)
	// =========================================================================
	fmt.Println("👉 [6/12] Seeding Dynamic Doctor Practice Schedules...")
	andiDocID := doctorIDs["andi@telemedhub.com"]

	// Clear old unbooked availability for andi
	_, _ = pool.Exec(ctx, "DELETE FROM doctor_availability WHERE doctor_id = $1 AND is_booked = false", andiDocID)

	now := time.Now()
	// Midnight of today in local/UTC
	todayYear, todayMonth, todayDay := now.Date()
	todayBase := time.Date(todayYear, todayMonth, todayDay, 0, 0, 0, 0, now.Location())

	// Slot 1: Today 09:00 - 10:00 (Booked by Timur)
	slot1Start := todayBase.Add(9 * time.Hour)
	slot1End := todayBase.Add(10 * time.Hour)
	var slot1ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO doctor_availability (doctor_id, start_time, end_time, is_booked, created_at, updated_at)
		VALUES ($1, $2, $3, true, NOW(), NOW())
		RETURNING id
	`, andiDocID, slot1Start, slot1End).Scan(&slot1ID)
	if err != nil {
		log.Fatalf("Error creating slot 1: %v", err)
	}

	// Slot 2: Today 10:30 - 11:30 (Booked by Anisa)
	slot2Start := todayBase.Add(10*time.Hour + 30*time.Minute)
	slot2End := todayBase.Add(11*time.Hour + 30*time.Minute)
	var slot2ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO doctor_availability (doctor_id, start_time, end_time, is_booked, created_at, updated_at)
		VALUES ($1, $2, $3, true, NOW(), NOW())
		RETURNING id
	`, andiDocID, slot2Start, slot2End).Scan(&slot2ID)
	if err != nil {
		log.Fatalf("Error creating slot 2: %v", err)
	}

	// Slot 3: Past Slot (2 days ago, completed for Timur)
	pastStart := todayBase.Add(-48 * time.Hour).Add(14 * time.Hour)
	pastEnd := pastStart.Add(1 * time.Hour)
	var slotPastID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO doctor_availability (doctor_id, start_time, end_time, is_booked, created_at, updated_at)
		VALUES ($1, $2, $3, true, NOW(), NOW())
		RETURNING id
	`, andiDocID, pastStart, pastEnd).Scan(&slotPastID)
	if err != nil {
		log.Fatalf("Error creating past slot: %v", err)
	}

	// Additional available slots for Today, Tomorrow, Day after tomorrow
	availSlots := []struct {
		Start time.Time
		End   time.Time
	}{
		{todayBase.Add(13*time.Hour + 30*time.Minute), todayBase.Add(14*time.Hour + 30*time.Minute)},
		{todayBase.Add(15 * time.Hour), todayBase.Add(16 * time.Hour)},
		{todayBase.Add(24*time.Hour + 9*time.Hour), todayBase.Add(24*time.Hour + 10*time.Hour)},
		{todayBase.Add(24*time.Hour + 10*time.Hour + 30*time.Minute), todayBase.Add(24*time.Hour + 11*time.Hour + 30*time.Minute)},
		{todayBase.Add(24*time.Hour + 14*time.Hour), todayBase.Add(24*time.Hour + 15*time.Hour)},
		{todayBase.Add(48*time.Hour + 9*time.Hour), todayBase.Add(48*time.Hour + 10*time.Hour)},
		{todayBase.Add(48*time.Hour + 13*time.Hour + 30*time.Minute), todayBase.Add(48*time.Hour + 14*time.Hour + 30*time.Minute)},
	}
	for _, sl := range availSlots {
		_, _ = pool.Exec(ctx, `
			INSERT INTO doctor_availability (doctor_id, start_time, end_time, is_booked, created_at, updated_at)
			VALUES ($1, $2, $3, false, NOW(), NOW())
		`, andiDocID, sl.Start, sl.End)
	}

	// =========================================================================
	// 7. Seed Appointments & Consultations
	// =========================================================================
	fmt.Println("👉 [7/12] Seeding Appointments, Consultations & Chat Messages...")
	timurPatID := patientIDs["timur@telemedhub.com"]
	anisaPatID := patientIDs["anisa@telemedhub.com"]

	// Appointment 1: Timur today (in_progress / confirmed queue)
	var apt1ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO appointments (patient_id, doctor_id, availability_id, status, scheduled_at, created_at, updated_at)
		VALUES ($1, $2, $3, 'confirmed', $4, NOW(), NOW())
		RETURNING id
	`, timurPatID, andiDocID, slot1ID, slot1Start).Scan(&apt1ID)
	if err != nil {
		log.Fatalf("Error creating appointment 1: %v", err)
	}

	var cons1ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO consultations (appointment_id, status, notes, started_at, created_at, updated_at)
		VALUES ($1, 'scheduled', 'Keluhan demam 3 hari naik turun disertai mual dan rasa nyeri di belakang bola mata.', $2, NOW(), NOW())
		RETURNING id
	`, apt1ID, slot1Start).Scan(&cons1ID)
	if err != nil {
		log.Fatalf("Error creating consultation 1: %v", err)
	}

	// Appointment 2: Anisa today
	var apt2ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO appointments (patient_id, doctor_id, availability_id, status, scheduled_at, created_at, updated_at)
		VALUES ($1, $2, $3, 'confirmed', $4, NOW(), NOW())
		RETURNING id
	`, anisaPatID, andiDocID, slot2ID, slot2Start).Scan(&apt2ID)
	if err != nil {
		log.Fatalf("Error creating appointment 2: %v", err)
	}

	var cons2ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO consultations (appointment_id, status, notes, started_at, created_at, updated_at)
		VALUES ($1, 'scheduled', 'Keluhan nyeri ulu hati akut dan refluks lambung setelah konsumsi NSAID tanpa resep.', $2, NOW(), NOW())
		RETURNING id
	`, apt2ID, slot2Start).Scan(&cons2ID)
	if err != nil {
		log.Fatalf("Error creating consultation 2: %v", err)
	}

	// Appointment 3: Timur past completed consultation (Anchor for consultation room & EMR!)
	var aptPastID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO appointments (patient_id, doctor_id, availability_id, status, scheduled_at, created_at, updated_at)
		VALUES ($1, $2, $3, 'completed', $4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
		RETURNING id
	`, timurPatID, andiDocID, slotPastID, pastStart).Scan(&aptPastID)
	if err != nil {
		log.Fatalf("Error creating past appointment: %v", err)
	}

	var consPastID uuid.UUID
	pastNotes := "Diagnosis Klinis: Observasi Febris Hari ke-3 e.c. Suspek Dengue Infection (ICD-10: A90). Tekanan Darah: 115/75 mmHg, Nadi: 88x/menit, Suhu: 38.6°C. Rencana terapi: Paracetamol Forte dosis teratur, antihistamin cetirizine untuk istirahat malam, rehidrasi oralit 3L/hari, serta evaluasi trombosit serial 24 jam."
	err = pool.QueryRow(ctx, `
		INSERT INTO consultations (appointment_id, status, notes, started_at, ended_at, created_at, updated_at)
		VALUES ($1, 'completed', $2, $3, $4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
		RETURNING id
	`, aptPastID, pastNotes, pastStart, pastStart.Add(30*time.Minute)).Scan(&consPastID)
	if err != nil {
		log.Fatalf("Error creating past consultation: %v", err)
	}

	// Dialogue Messages for consPastID (dr. Andi and Timur)
	timurUserID := userIDs["timur@telemedhub.com"]
	andiUserID := userIDs["andi@telemedhub.com"]

	chatScript := []struct {
		SenderID   uuid.UUID
		Message    string
		MinuteOffs int
	}{
		{andiUserID, "Selamat pagi Mas Timur, perkenalkan saya dr. Andi Pratama, Sp.PD. Boleh diceritakan keluhan utama yang sedang dirasakan saat ini?", 1},
		{timurUserID, "Pagi Dok. Saya demam sejak 3 hari yang lalu, suhu naik turun di kisaran 38.5°C. Badan terasa pegal-pegal terutama di persendian tangan-kaki dan pusing di belakang mata.", 3},
		{andiUserID, "Baik Mas Timur. Apakah ada gejala batuk, pilek, sakit tenggorokan, atau ada tanda perdarahan seperti bintik merah di kulit, gusi berdarah, atau mimisan?", 5},
		{timurUserID, "Tidak ada batuk dan pilek dok. Mual sedikit kalau makan nasi, tapi bintik merah dan mimisan tidak ada.", 7},
		{andiUserID, "Mengingat karakteristik demam mendadak hari ke-3 tanpa gejala saluran napas, kita waspadai infeksi virus Dengue (DBD Fase Febris). Saya sudah terbitkan resep digital untuk penurun panas Paracetamol sirup forte yang aman untuk lambung dan Cetirizine. Paling krusial: jaga hidrasi minimal 2.5 - 3 liter per hari (air putih, oralit, atau air kelapa).", 10},
		{timurUserID, "Baik Dok, resepnya sudah langsung masuk ke menu pesanan farmasi saya. Terima kasih banyak atas penjelasan dan arahannya.", 12},
		{andiUserID, "Sama-sama Mas Timur. Jika dalam 24-48 jam muncul lemas berlebih, muntah terus-menerus, atau nyeri perut hebat (fase kritis), segera ke IGD terdekat ya. Semoga lekas sembuh!", 14},
	}
	for _, msg := range chatScript {
		_, _ = pool.Exec(ctx, `
			INSERT INTO consultation_messages (consultation_id, sender_id, message, created_at)
			VALUES ($1, $2, $3, $4)
		`, consPastID, msg.SenderID, msg.Message, pastStart.Add(time.Duration(msg.MinuteOffs)*time.Minute))
	}

	// =========================================================================
	// 8. Seed Prescriptions & Prescription Items
	// =========================================================================
	fmt.Println("👉 [8/12] Seeding Digital Prescriptions & Fulfillment Items...")
	var rxID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO prescriptions (consultation_id, patient_id, doctor_id, issued_at, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'active', $4, $4)
		RETURNING id
	`, consPastID, timurPatID, andiDocID, pastStart.Add(15*time.Minute)).Scan(&rxID)
	if err != nil {
		log.Fatalf("Error creating prescription: %v", err)
	}

	sanmolID := medicineIDs["Sanmol Forte Sirup 60ml (Paracetamol 250mg/5ml)"]
	cetirizineID := medicineIDs["Cetirizine HCl 10mg Box 30 Tablet"]

	_, _ = pool.Exec(ctx, `
		INSERT INTO prescription_items (prescription_id, medicine_id, dosage, quantity, instructions, created_at, updated_at)
		VALUES 
		($1, $2, '250mg/5ml (10ml)', 2, '3x sehari 2 sendok takar sesudah makan saat demam', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
		($1, $3, '10mg', 1, '1x sehari 1 tablet pada malam hari sebelum tidur', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
	`, rxID, sanmolID, cetirizineID)

	// =========================================================================
	// 9. Seed Orders & Order Items (Pharmacy Showcase)
	// =========================================================================
	fmt.Println("👉 [9/12] Seeding Smart Pharmacy Orders (Processing, Shipped, Delivered, Pending)...")
	paracetamolID := medicineIDs["Paracetamol 500mg Strip 10 Tablet"]
	cefiximeID := medicineIDs["Cefixime Trihydrate 100mg Box 30 Kapsul"]
	imboostID := medicineIDs["Imboost Force Sirup 120ml Multivitamin"]
	omeprazoleID := medicineIDs["Omeprazole 20mg Kapsul Strip 10"]
	betahistineID := medicineIDs["Betahistine Mesilate 6mg Strip 10 Tablet"]

	// Order 1: Processing (Timur, linked to prescription)
	var ord1ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO orders (patient_id, prescription_id, status, total_amount, created_at, updated_at)
		VALUES ($1, $2, 'processing', 125000.00, NOW() - INTERVAL '1 day', NOW())
		RETURNING id
	`, timurPatID, rxID).Scan(&ord1ID)
	if err == nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, created_at, updated_at)
			VALUES 
			($1, $2, 2, 38500.00, NOW() - INTERVAL '1 day', NOW()),
			($1, $3, 1, 18000.00, NOW() - INTERVAL '1 day', NOW())
		`, ord1ID, sanmolID, cetirizineID)
	}

	// Order 2: Shipped (Anisa)
	var ord2ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO orders (patient_id, status, total_amount, created_at, updated_at)
		VALUES ($1, 'shipped', 152000.00, NOW() - INTERVAL '18 hours', NOW())
		RETURNING id
	`, anisaPatID).Scan(&ord2ID)
	if err == nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, created_at, updated_at)
			VALUES ($1, $2, 2, 76000.00, NOW() - INTERVAL '18 hours', NOW())
		`, ord2ID, imboostID)
	}

	// Order 3: Delivered (Timur, History)
	var ord3ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO orders (patient_id, status, total_amount, created_at, updated_at)
		VALUES ($1, 'delivered', 117500.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days')
		RETURNING id
	`, timurPatID).Scan(&ord3ID)
	if err == nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, created_at, updated_at)
			VALUES 
			($1, $2, 3, 24000.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
			($1, $3, 2, 16500.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
			($1, $4, 2, 6500.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days')
		`, ord3ID, betahistineID, omeprazoleID, paracetamolID)
	}

	// Order 4: Pending (Bambang)
	bambangPatID := patientIDs["bambang@telemedhub.com"]
	var ord4ID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO orders (patient_id, status, total_amount, created_at, updated_at)
		VALUES ($1, 'pending', 64000.00, NOW() - INTERVAL '2 hours', NOW())
		RETURNING id
	`, bambangPatID).Scan(&ord4ID)
	if err == nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, created_at, updated_at)
			VALUES ($1, $2, 2, 32000.00, NOW() - INTERVAL '2 hours', NOW())
		`, ord4ID, cefiximeID)
	}

	// Stock Mutations
	sintaUserID := userIDs["sinta@telemedhub.com"]
	mutations := []struct {
		MedID       uuid.UUID
		Type        string
		Qty         int
		Before      int
		After       int
		RefType     string
		Notes       string
		CreatedDays int
	}{
		{sanmolID, "in", 150, 0, 150, "initial_stock", "Penerimaan stok awal batch SNM-2026-08 dari Kimia Farma Trading", 7},
		{sanmolID, "out", 30, 150, 120, "order_fulfillment", "Fulfillment pesanan resep digital telemedisin", 1},
		{paracetamolID, "in", 500, 0, 500, "initial_stock", "Penerimaan stok awal batch PCT-2026-01", 7},
		{paracetamolID, "out", 50, 500, 450, "order_fulfillment", "Fulfillment pesanan reguler pasien", 2},
		{imboostID, "in", 80, 0, 80, "initial_stock", "Penerimaan multivitamin sirup batch IMB-2026", 7},
		{imboostID, "out", 20, 80, 60, "manual_adjustment", "Penyesuaian stok berkala (buffer karantina display farmasi)", 3},
	}
	for _, m := range mutations {
		_, _ = pool.Exec(ctx, `
			INSERT INTO stock_mutations (medicine_id, mutation_type, quantity, stock_before, stock_after, reference_type, notes, created_by, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - ($9 || ' days')::INTERVAL)
		`, m.MedID, m.Type, m.Qty, m.Before, m.After, m.RefType, m.Notes, sintaUserID, m.CreatedDays)
	}

	// =========================================================================
	// 10. Seed Medical Records (EMR Showcase)
	// =========================================================================
	fmt.Println("👉 [10/12] Seeding Comprehensive Electronic Medical Records (EMR)...")
	medicalRecordsData := []struct {
		RecordType string
		Content    string
		CreatedAgo time.Duration
	}{
		{
			RecordType: "diagnosis",
			Content:    "Observasi Febris Hari ke-3 e.c. Suspek Dengue Infection (ICD-10: A90). Tekanan Darah: 115/75 mmHg, Nadi: 88x/menit, Suhu Aksila: 38.6°C, SpO2: 98% room air. Gejala penyerta: Sefalgia retro-orbital, artralgia, dan anoreksia ringan.",
			CreatedAgo: 2 * 24 * time.Hour,
		},
		{
			RecordType: "allergy",
			Content:    "Alergi Obat: Golongan Penisilin & Derivat Aminopenisilin (Reaksi: Urtikaria akut, pruritus menyeluruh, dan ruam makulopapular eritematosa). PERINGATAN: Hindari Amoxicillin, Ampicillin, dan Co-Amoxiclav.",
			CreatedAgo: 60 * 24 * time.Hour,
		},
		{
			RecordType: "lab_result",
			Content:    "Pemeriksaan Hematologi Rutin & Serologi Demam Berdarah:\n• Hemoglobin: 14.2 g/dL (Normal)\n• Hematokrit: 41.8% (Hemokonsentrasi ringan)\n• Leukosit: 3.100 /uL (Leukopenia)\n• Trombosit: 124.000 /uL (Trombositopenia ringan)\n• Rapid Dengue NS1 Antigen: POSITIF / REAKTIF (+)",
			CreatedAgo: 2 * 24 * time.Hour,
		},
		{
			RecordType: "note",
			Content:    "Edukasi Mandiri & Rencana Monitoring Demam Berdarah:\n1. Tirah baring dan hidrasi oralit / cairan elektrolit minimal 2.5 - 3 liter per hari.\n2. Jadwal pemeriksaan laboratorium darah lengkap kontrol serial setelah 48 jam.\n3. Edukasi tanda bahaya (warning signs) syok dengue: nyeri perut hebat, muntah persisten, lemas ekstrem, dan perdarahan spontan.",
			CreatedAgo: 2 * 24 * time.Hour,
		},
	}

	for _, rec := range medicalRecordsData {
		recID := uuid.New()
		_, _ = pool.Exec(ctx, `
			INSERT INTO medical_records (id, patient_id, consultation_id, record_type, content, created_by, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			ON CONFLICT (id) DO NOTHING
		`, recID, timurPatID, consPastID, rec.RecordType, rec.Content, andiUserID, time.Now().Add(-rec.CreatedAgo))
	}

	// =========================================================================
	// 11. Seed Doctor Reviews & AI Triage Sessions
	// =========================================================================
	fmt.Println("👉 [11/12] Seeding Verified Patient Reviews & AI Triage Assessments...")
	// Review for consPastID
	_, _ = pool.Exec(ctx, `
		INSERT INTO doctor_reviews (consultation_id, doctor_id, patient_id, rating, comment, created_at, updated_at)
		VALUES ($1, $2, $3, 5, 'dr. Andi sangat teliti dan penjelasannya mengenai penanganan demam dengue sangat menenangkan. Respons resep digitalnya sangat cepat dan terhubung langsung ke farmasi!', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
		ON CONFLICT (consultation_id) DO UPDATE SET
			rating = EXCLUDED.rating,
			comment = EXCLUDED.comment
	`, consPastID, andiDocID, timurPatID)

	// AI Triage 1: Closed Session (Vertigo BPPV)
	aiSession1ID := uuid.New()
	_, _ = pool.Exec(ctx, `
		INSERT INTO ai_sessions (id, patient_id, status, created_at, updated_at)
		VALUES ($1, $2, 'closed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
		ON CONFLICT (id) DO NOTHING
	`, aiSession1ID, timurPatID)

	_, _ = pool.Exec(ctx, `
		INSERT INTO ai_suggestions (id, session_id, input_summary, suggested_urgency, suggested_specialty, disclaimer_shown, created_at)
		VALUES ($1, $2, $3, 'medium', 'Spesialis Neurologi (Saraf) atau Spesialis THT', true, NOW() - INTERVAL '3 days')
		ON CONFLICT (id) DO NOTHING
	`, uuid.New(), aiSession1ID, "Sensasi kepala berputar hebat saat perubahan posisi tidur atau miring ke kanan, disertai mual dan keringat dingin sejak 2 hari terakhir.")

	// AI Triage 2: Active Session (Demam Febris Akut)
	aiSession2ID := uuid.New()
	_, _ = pool.Exec(ctx, `
		INSERT INTO ai_sessions (id, patient_id, status, created_at, updated_at)
		VALUES ($1, $2, 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
		ON CONFLICT (id) DO NOTHING
	`, aiSession2ID, timurPatID)

	_, _ = pool.Exec(ctx, `
		INSERT INTO ai_suggestions (id, session_id, input_summary, suggested_urgency, suggested_specialty, disclaimer_shown, created_at)
		VALUES ($1, $2, $3, 'high', 'Spesialis Penyakit Dalam (Internal Medicine)', true, NOW() - INTERVAL '2 hours')
		ON CONFLICT (id) DO NOTHING
	`, uuid.New(), aiSession2ID, "Demam tinggi mendadak hari ke-3 di atas 38.5°C, nyeri di belakang bola mata, pegal-pegal persendian seluruh tubuh, dan nafsu makan menurun.")

	// =========================================================================
	// 12. Seed Governance Audit Logs (Security Showcase)
	// =========================================================================
	fmt.Println("👉 [12/12] Seeding Enterprise Governance Audit Logs...")
	adminUserID := userIDs["admin@telemedhub.com"]
	sarahDocID := doctorIDs["sarah@telemedhub.com"]
	budiDocID := doctorIDs["budi@telemedhub.com"]

	metaDocVerify, _ := json.Marshal(map[string]interface{}{
		"notes":  "Verifikasi berkas STR KKI dan SIP dinkes terkonfirmasi valid.",
		"actor":  "Administrator Medis",
		"status": "verified",
	})
	metaRecRead, _ := json.Marshal(map[string]interface{}{
		"notes":    "Akses data rekam medis untuk persiapan sesi konsultasi klinis.",
		"scope":    "clinical_consultation",
		"provider": "dr. Andi Pratama, Sp.PD",
	})
	metaRecCreated, _ := json.Marshal(map[string]interface{}{
		"notes":     "Penerbitan catatan diagnosis klinis baru (ICD-10: A90).",
		"patient":   "Timur Dian Radhasejati",
		"record_id": consPastID.String(),
	})
	metaUserUpdate, _ := json.Marshal(map[string]interface{}{
		"notes":   "Pembaruan data kontak profil pasien terverifikasi.",
		"channel": "admin_console",
	})

	auditSeeds := []struct {
		ActorID    uuid.UUID
		Action     string
		TargetType string
		TargetID   uuid.UUID
		IP         string
		UA         string
		Metadata   []byte
		AgoHours   int
	}{
		{adminUserID, "doctor.verified", "doctor", sarahDocID, "192.168.1.10", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0", metaDocVerify, 72},
		{adminUserID, "doctor.verified", "doctor", budiDocID, "192.168.1.10", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0", metaDocVerify, 48},
		{andiUserID, "medical_record.read", "medical_record", timurPatID, "182.253.12.44", "Mozilla/5.0 (Macintosh; Apple Silicon) Safari/605.1.15", metaRecRead, 24},
		{andiUserID, "medical_record.created", "medical_record", timurPatID, "182.253.12.44", "Mozilla/5.0 (Macintosh; Apple Silicon) Safari/605.1.15", metaRecCreated, 24},
		{adminUserID, "user.updated", "user", timurUserID, "192.168.1.10", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0", metaUserUpdate, 6},
		{timurUserID, "medical_record.read", "medical_record", timurPatID, "114.124.200.15", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Mobile/15E148", metaRecRead, 2},
	}

	for _, a := range auditSeeds {
		_, _ = pool.Exec(ctx, `
			INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, ip_address, user_agent, metadata, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - ($9 || ' hours')::INTERVAL)
		`, uuid.New(), a.ActorID, a.Action, a.TargetType, a.TargetID, a.IP, a.UA, a.Metadata, a.AgoHours)
	}

	fmt.Println("\n🎉 SEEDING SHOWCASE BERHASIL LENGKAP!")
	fmt.Println("=================================================================")
	fmt.Println("Akun Login Utama (Password: Rahasia123!):")
	fmt.Println("  1. Pasien        : timur@telemedhub.com (Timur Dian Radhasejati)")
	fmt.Println("  2. Dokter Utama  : andi@telemedhub.com (dr. Andi Pratama, Sp.PD)")
	fmt.Println("  3. Staf Farmasi  : sinta@telemedhub.com (Apt. Sinta Permatasari, S.Farm)")
	fmt.Println("  4. Administrator : admin@telemedhub.com (Administrator Medis)")
	fmt.Println("  5. Dokter Pending: hendra@telemedhub.com (dr. Hendra Wijaya, Sp.N - Siap diverifikasi Admin)")
	fmt.Println("=================================================================")
	fmt.Println("Direct URLs untuk Screenshot Showcase:")
	fmt.Printf("  • Doctor Dashboard         : http://localhost:5173/doctor\n")
	fmt.Printf("  • Doctor Schedule Console   : http://localhost:5173/doctor/schedule\n")
	fmt.Printf("  • Consultation Room (Active): http://localhost:5173/doctor/consultation/%s\n", cons1ID)
	fmt.Printf("  • Consultation Room (Past)  : http://localhost:5173/doctor/consultation/%s\n", consPastID)
	fmt.Printf("  • Smart Pharmacy Console    : http://localhost:5173/pharmacy\n")
	fmt.Printf("  • AI Triage Hub             : http://localhost:5173/patient/ai-triage\n")
	fmt.Printf("  • AI Triage Detail (Active) : http://localhost:5173/patient/ai-triage/%s\n", aiSession2ID)
	fmt.Printf("  • AI Triage Detail (Closed) : http://localhost:5173/patient/ai-triage/%s\n", aiSession1ID)
	fmt.Printf("  • Patient EMR Records       : http://localhost:5173/patient/records\n")
	fmt.Printf("  • Patient Digital Wallet    : http://localhost:5173/patient/wallet\n")
	fmt.Printf("  • Patient Pharmacy Orders   : http://localhost:5173/patient/orders\n")
	fmt.Printf("  • Patient Appointments      : http://localhost:5173/patient/appointments\n")
	fmt.Printf("  • Admin Overview Dashboard  : http://localhost:5173/admin\n")
	fmt.Printf("  • Admin Doctor Verification : http://localhost:5173/admin/doctors\n")
	fmt.Printf("  • Admin User Management     : http://localhost:5173/admin/users\n")
	fmt.Printf("  • Admin Security Audit Trail: http://localhost:5173/admin/audit\n")
	fmt.Println("=================================================================")
}
