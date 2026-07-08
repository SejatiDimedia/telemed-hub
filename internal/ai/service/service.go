package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
)

var (
	ErrActiveSessionExists = errors.New("active ai session already exists")
	ErrSessionClosed       = errors.New("ai session is closed")
	ErrUnauthorized        = errors.New("unauthorized access to ai session")
)

type AIService interface {
	CreateSession(ctx context.Context, patientUserID uuid.UUID) (*dto.CreateSessionResponse, error)
	PostMessage(ctx context.Context, patientUserID uuid.UUID, sessionID uuid.UUID, message string) (*dto.TriageResponse, error)
	GetSession(ctx context.Context, userID uuid.UUID, roles []string, sessionID uuid.UUID) (*dto.SessionResponse, error)
	ListSessions(ctx context.Context, patientUserID uuid.UUID) ([]*dto.SessionResponse, error)
	CloseInactiveSessions(ctx context.Context) error
}
