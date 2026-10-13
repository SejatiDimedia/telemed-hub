package model

import (
	"time"

	"github.com/google/uuid"
)

// ConsultationMessage represents a single chat message sent during a consultation.
type ConsultationMessage struct {
	ID             uuid.UUID
	ConsultationID uuid.UUID
	SenderID       uuid.UUID
	SenderName     string
	SenderRole     string
	Message        string
	AttachmentURL  *string
	CreatedAt      time.Time
}

// RoomDetails represents complete live consultation room participant & session data.
type RoomDetails struct {
	ConsultationID  uuid.UUID
	AppointmentID   uuid.UUID
	Status          string
	Notes           *string
	DoctorID        uuid.UUID
	DoctorUserID    uuid.UUID
	DoctorName      string
	DoctorAvatar    *string
	DoctorSpecialty *string
	PatientID       uuid.UUID
	PatientUserID   uuid.UUID
	PatientName     string
	PatientAvatar   *string
	PatientGender   *string
	PatientBlood    *string
	PatientDOB      *time.Time
}
