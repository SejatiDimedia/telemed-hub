package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	doctorDTO "github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
)

var (
	ErrInvalidTransition        = errors.New("invalid consultation status transition")
	ErrUnauthorized             = errors.New("unauthorized action on consultation")
	ErrConsultationNotFound     = errors.New("consultation not found")
	ErrConsultationNotCompleted = errors.New("consultation must be completed before submitting a review")
	ErrAlreadyReviewed          = errors.New("consultation has already been reviewed")
)

type ConsultationService interface {
	CreateConsultation(ctx context.Context, appointmentID uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationResponse, error)
	Start(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error)
	Complete(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error)
	UpdateNotes(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID, notes string) (*dto.ConsultationResponse, error)
	CancelConsultation(ctx context.Context, appointmentID uuid.UUID) error
	GetRoom(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationRoomResponse, error)
	SendMessage(ctx context.Context, consultationID uuid.UUID, senderID uuid.UUID, req dto.SendMessageRequest) (*dto.MessageResponse, error)
	ListMessages(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) ([]dto.MessageResponse, error)
	CreateReview(ctx context.Context, consultationID uuid.UUID, patientUserID uuid.UUID, req doctorDTO.CreateReviewRequest) (*doctorDTO.ReviewResponse, error)
	GetReview(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) (*doctorDTO.ReviewResponse, error)
}
