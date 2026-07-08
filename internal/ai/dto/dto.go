package dto

import (
	"time"
)

type CreateSessionResponse struct {
	ID        string    `json:"id"`
	PatientID string    `json:"patient_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type PostMessageRequest struct {
	Message string `json:"message" validate:"required,min=5,max=2000"`
}

type TriageResponse struct {
	SuggestedUrgency   string `json:"suggested_urgency"`
	SuggestedSpecialty string `json:"suggested_specialty"`
	Disclaimer         string `json:"disclaimer"`
	SessionID          string `json:"session_id"`
}

type SuggestionResponse struct {
	ID                 string    `json:"id"`
	InputSummary       string    `json:"input_summary"`
	SuggestedUrgency   string    `json:"suggested_urgency"`
	SuggestedSpecialty string    `json:"suggested_specialty"`
	DisclaimerShown    bool      `json:"disclaimer_shown"`
	CreatedAt          time.Time `json:"created_at"`
}

type SessionResponse struct {
	ID          string               `json:"id"`
	PatientID   string               `json:"patient_id"`
	Status      string               `json:"status"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
	Suggestions []SuggestionResponse `json:"suggestions"`
}
