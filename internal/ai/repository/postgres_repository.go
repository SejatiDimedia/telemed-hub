package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/model"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

var _ AIRepository = (*PostgresRepository)(nil)

func (r *PostgresRepository) CreateSession(ctx context.Context, s *model.AISession) error {
	query := `
		INSERT INTO ai_sessions (id, patient_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(ctx, query, s.ID, s.PatientID, s.Status, s.CreatedAt, s.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert ai session: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetActiveSessionByPatientID(ctx context.Context, patientID uuid.UUID) (*model.AISession, error) {
	query := `
		SELECT id, patient_id, status, created_at, updated_at
		FROM ai_sessions
		WHERE patient_id = $1 AND status = 'active'
		LIMIT 1
	`
	var s model.AISession
	err := r.db.QueryRow(ctx, query, patientID).Scan(&s.ID, &s.PatientID, &s.Status, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No active session found is normal
		}
		return nil, fmt.Errorf("failed to query active ai session: %w", err)
	}
	return &s, nil
}

func (r *PostgresRepository) GetSessionByID(ctx context.Context, id uuid.UUID) (*model.AISession, error) {
	query := `
		SELECT id, patient_id, status, created_at, updated_at
		FROM ai_sessions
		WHERE id = $1
	`
	var s model.AISession
	err := r.db.QueryRow(ctx, query, id).Scan(&s.ID, &s.PatientID, &s.Status, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to query ai session by ID: %w", err)
	}
	return &s, nil
}

func (r *PostgresRepository) ListSessionsByPatientID(ctx context.Context, patientID uuid.UUID) ([]*model.AISession, error) {
	query := `
		SELECT id, patient_id, status, created_at, updated_at
		FROM ai_sessions
		WHERE patient_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to list ai sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*model.AISession
	for rows.Next() {
		var s model.AISession
		if err := rows.Scan(&s.ID, &s.PatientID, &s.Status, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan ai session row: %w", err)
		}
		sessions = append(sessions, &s)
	}
	return sessions, nil
}

func (r *PostgresRepository) UpdateSessionUpdatedAt(ctx context.Context, id uuid.UUID, updatedAt time.Time) error {
	query := `
		UPDATE ai_sessions
		SET updated_at = $1
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, updatedAt, id)
	if err != nil {
		return fmt.Errorf("failed to update ai session updated_at: %w", err)
	}
	return nil
}

func (r *PostgresRepository) CloseSession(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE ai_sessions
		SET status = 'closed', updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to close ai session: %w", err)
	}
	return nil
}

func (r *PostgresRepository) CreateSuggestion(ctx context.Context, s *model.AISuggestion) error {
	query := `
		INSERT INTO ai_suggestions (id, session_id, input_summary, suggested_urgency, suggested_specialty, disclaimer_shown, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query, s.ID, s.SessionID, s.InputSummary, s.SuggestedUrgency, s.SuggestedSpecialty, s.DisclaimerShown, s.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert ai suggestion: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetSuggestionsBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*model.AISuggestion, error) {
	query := `
		SELECT id, session_id, input_summary, suggested_urgency, suggested_specialty, disclaimer_shown, created_at
		FROM ai_suggestions
		WHERE session_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query ai suggestions: %w", err)
	}
	defer rows.Close()

	var suggestions []*model.AISuggestion
	for rows.Next() {
		var s model.AISuggestion
		if err := rows.Scan(&s.ID, &s.SessionID, &s.InputSummary, &s.SuggestedUrgency, &s.SuggestedSpecialty, &s.DisclaimerShown, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan ai suggestion row: %w", err)
		}
		suggestions = append(suggestions, &s)
	}
	return suggestions, nil
}

func (r *PostgresRepository) CloseInactiveSessions(ctx context.Context, threshold time.Time) (int64, error) {
	query := `
		UPDATE ai_sessions
		SET status = 'closed', updated_at = NOW()
		WHERE status = 'active' AND updated_at < $1
	`
	res, err := r.db.Exec(ctx, query, threshold)
	if err != nil {
		return 0, fmt.Errorf("failed to close inactive ai sessions: %w", err)
	}
	return res.RowsAffected(), nil
}
