package model

import (
	"time"

	"github.com/google/uuid"
)

type AISession struct {
	ID        uuid.UUID `json:"id"`
	PatientID uuid.UUID `json:"patient_id"`
	Status    string    `json:"status"` // "active", "closed"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AISuggestion struct {
	ID                 uuid.UUID `json:"id"`
	SessionID          uuid.UUID `json:"session_id"`
	InputSummary       string    `json:"input_summary"`
	SuggestedUrgency   string    `json:"suggested_urgency"` // "low", "medium", "high"
	SuggestedSpecialty string    `json:"suggested_specialty"`
	DisclaimerShown    bool      `json:"disclaimer_shown"`
	CreatedAt          time.Time `json:"created_at"`
}
