package model

import (
	"time"

	"github.com/google/uuid"
)

// DoctorReview represents a clinical review and rating left by a patient for a doctor.
type DoctorReview struct {
	ID             uuid.UUID  `json:"id"`
	ConsultationID uuid.UUID  `json:"consultation_id"`
	DoctorID       uuid.UUID  `json:"doctor_id"`
	PatientID      uuid.UUID  `json:"patient_id"`
	Rating         int        `json:"rating"`
	Comment        *string    `json:"comment"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
	CreatedBy      *uuid.UUID `json:"created_by,omitempty"`
	UpdatedBy      *uuid.UUID `json:"updated_by,omitempty"`
}

// DoctorReviewWithPatient represents a review joined with sanitized patient info.
type DoctorReviewWithPatient struct {
	ID             uuid.UUID  `json:"id"`
	ConsultationID uuid.UUID  `json:"consultation_id"`
	DoctorID       uuid.UUID  `json:"doctor_id"`
	PatientID      uuid.UUID  `json:"patient_id"`
	PatientName    string     `json:"patient_name"`
	Rating         int        `json:"rating"`
	Comment        *string    `json:"comment"`
	CreatedAt      time.Time  `json:"created_at"`
}

// ReviewSummary represents statistical aggregate rating information for a doctor.
type ReviewSummary struct {
	AverageRating float64     `json:"average_rating"`
	TotalReviews  int         `json:"total_reviews"`
	RatingCounts  map[int]int `json:"rating_counts"` // key: 1..5, value: count
}
