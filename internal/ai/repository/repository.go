package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/model"
)

var (
	ErrSessionNotFound = errors.New("ai session not found")
)

type AIRepository interface {
	CreateSession(ctx context.Context, s *model.AISession) error
	GetActiveSessionByPatientID(ctx context.Context, patientID uuid.UUID) (*model.AISession, error)
	GetSessionByID(ctx context.Context, id uuid.UUID) (*model.AISession, error)
	ListSessionsByPatientID(ctx context.Context, patientID uuid.UUID) ([]*model.AISession, error)
	UpdateSessionUpdatedAt(ctx context.Context, id uuid.UUID, updatedAt time.Time) error
	CloseSession(ctx context.Context, id uuid.UUID) error
	CreateSuggestion(ctx context.Context, s *model.AISuggestion) error
	GetSuggestionsBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*model.AISuggestion, error)
	CloseInactiveSessions(ctx context.Context, threshold time.Time) (int64, error)
}
