-- Migration 0016: Create doctor reviews and add rating stats to doctors

-- Add rating columns to doctors table
ALTER TABLE doctors ADD COLUMN rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE doctors ADD COLUMN total_reviews INT NOT NULL DEFAULT 0;

CREATE INDEX idx_doctors_rating ON doctors(rating DESC) WHERE deleted_at IS NULL;

-- Table: doctor_reviews
CREATE TABLE doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Indexes for doctor_reviews
CREATE INDEX idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctor_reviews_patient_id ON doctor_reviews(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctor_reviews_consultation_id ON doctor_reviews(consultation_id) WHERE deleted_at IS NULL;
