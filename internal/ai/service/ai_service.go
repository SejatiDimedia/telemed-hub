package service

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/model"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/repository"
	patientService "github.com/timurdianradhasejati/telemed_hub/internal/patient/service"
)

type AIServiceImpl struct {
	repo       repository.AIRepository
	llmClient  LLMClient
	patientSvc patientService.PatientService
	log        *slog.Logger

	// background close ticker control
	stopTicker chan struct{}
}

func NewAIService(
	repo repository.AIRepository,
	llmClient LLMClient,
	patientSvc patientService.PatientService,
	log *slog.Logger,
) *AIServiceImpl {
	return &AIServiceImpl{
		repo:       repo,
		llmClient:  llmClient,
		patientSvc: patientSvc,
		log:        log,
		stopTicker: make(chan struct{}),
	}
}

var _ AIService = (*AIServiceImpl)(nil)

func (s *AIServiceImpl) CreateSession(ctx context.Context, patientUserID uuid.UUID) (*dto.CreateSessionResponse, error) {
	// 1. Resolve Patient ID
	patProfile, err := s.patientSvc.GetProfileByUserID(ctx, patientUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve patient profile: %w", err)
	}
	patientID, err := uuid.Parse(patProfile.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid patient id: %w", err)
	}

	// 2. Enforce 1-active-session policy
	active, err := s.repo.GetActiveSessionByPatientID(ctx, patientID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, ErrActiveSessionExists
	}

	// 3. Create Session
	now := time.Now().UTC()
	sess := &model.AISession{
		ID:        uuid.New(),
		PatientID: patientID,
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.CreateSession(ctx, sess); err != nil {
		return nil, err
	}

	return &dto.CreateSessionResponse{
		ID:        sess.ID.String(),
		PatientID: sess.PatientID.String(),
		Status:    sess.Status,
		CreatedAt: sess.CreatedAt,
	}, nil
}

func (s *AIServiceImpl) PostMessage(ctx context.Context, patientUserID uuid.UUID, sessionID uuid.UUID, message string) (*dto.TriageResponse, error) {
	// 1. Resolve Patient ID
	patProfile, err := s.patientSvc.GetProfileByUserID(ctx, patientUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve patient profile: %w", err)
	}
	patientID, err := uuid.Parse(patProfile.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid patient id: %w", err)
	}

	// 2. Fetch Session
	sess, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// Verify Ownership
	if sess.PatientID != patientID {
		return nil, ErrUnauthorized
	}

	// Verify Status
	if sess.Status != "active" {
		return nil, ErrSessionClosed
	}

	// 3. PHI Protection: Strip Name & UUIDs
	anonymized := s.anonymizePrompt(message, patProfile.FullName, patientUserID.String(), patProfile.ID)

	// 4. Call LLM Triage
	triage, err := s.llmClient.Triage(ctx, anonymized)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI suggestions: %w", err)
	}

	// 5. Persist Triage Suggestion (with original message for audit)
	sugg := &model.AISuggestion{
		ID:                 uuid.New(),
		SessionID:          sessionID,
		InputSummary:       message, // Audit preserves raw input
		SuggestedUrgency:   triage.SuggestedUrgency,
		SuggestedSpecialty: triage.SuggestedSpecialty,
		DisclaimerShown:    true,
		CreatedAt:          time.Now().UTC(),
	}

	if err := s.repo.CreateSuggestion(ctx, sugg); err != nil {
		return nil, err
	}

	// 6. Update Session Timestamp
	if err := s.repo.UpdateSessionUpdatedAt(ctx, sessionID, time.Now().UTC()); err != nil {
		s.log.Error("failed to update ai session updated_at timestamp", "session_id", sessionID, "error", err)
	}

	triage.Disclaimer = "This is not a medical diagnosis. Please consult a licensed doctor for confirmation."
	triage.SessionID = sessionID.String()

	return triage, nil
}

func (s *AIServiceImpl) GetSession(ctx context.Context, userID uuid.UUID, roles []string, sessionID uuid.UUID) (*dto.SessionResponse, error) {
	// 1. Fetch Session
	sess, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// 2. Authorization Check: Admin can read any session; Patient can only read own session
	isAdmin := false
	for _, r := range roles {
		if r == "admin" {
			isAdmin = true
			break
		}
	}

	if !isAdmin {
		// Resolve Caller Patient ID
		patProfile, err := s.patientSvc.GetProfileByUserID(ctx, userID)
		if err != nil {
			return nil, ErrUnauthorized
		}
		patientID, _ := uuid.Parse(patProfile.ID)
		if sess.PatientID != patientID {
			return nil, ErrUnauthorized
		}
	}

	// 3. Fetch Suggestions
	suggs, err := s.repo.GetSuggestionsBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	var suggestionsList []dto.SuggestionResponse
	for _, su := range suggs {
		suggestionsList = append(suggestionsList, dto.SuggestionResponse{
			ID:                 su.ID.String(),
			InputSummary:       su.InputSummary,
			SuggestedUrgency:   su.SuggestedUrgency,
			SuggestedSpecialty: su.SuggestedSpecialty,
			DisclaimerShown:    su.DisclaimerShown,
			CreatedAt:          su.CreatedAt,
		})
	}

	return &dto.SessionResponse{
		ID:          sess.ID.String(),
		PatientID:   sess.PatientID.String(),
		Status:      sess.Status,
		CreatedAt:   sess.CreatedAt,
		UpdatedAt:   sess.UpdatedAt,
		Suggestions: suggestionsList,
	}, nil
}

func (s *AIServiceImpl) ListSessions(ctx context.Context, patientUserID uuid.UUID) ([]*dto.SessionResponse, error) {
	// 1. Resolve Patient ID
	patProfile, err := s.patientSvc.GetProfileByUserID(ctx, patientUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve patient profile: %w", err)
	}
	patientID, err := uuid.Parse(patProfile.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid patient id: %w", err)
	}

	// 2. Fetch Sessions
	sessions, err := s.repo.ListSessionsByPatientID(ctx, patientID)
	if err != nil {
		return nil, err
	}

	var resp []*dto.SessionResponse
	for _, sess := range sessions {
		suggs, err := s.repo.GetSuggestionsBySessionID(ctx, sess.ID)
		if err != nil {
			return nil, err
		}

		var suggestionsList []dto.SuggestionResponse
		for _, su := range suggs {
			suggestionsList = append(suggestionsList, dto.SuggestionResponse{
				ID:                 su.ID.String(),
				InputSummary:       su.InputSummary,
				SuggestedUrgency:   su.SuggestedUrgency,
				SuggestedSpecialty: su.SuggestedSpecialty,
				DisclaimerShown:    su.DisclaimerShown,
				CreatedAt:          su.CreatedAt,
			})
		}

		resp = append(resp, &dto.SessionResponse{
			ID:          sess.ID.String(),
			PatientID:   sess.PatientID.String(),
			Status:      sess.Status,
			CreatedAt:   sess.CreatedAt,
			UpdatedAt:   sess.UpdatedAt,
			Suggestions: suggestionsList,
		})
	}
	return resp, nil
}

// StartAutoCloseTicker runs a background task to close inactive sessions (> 24 hours)
func (s *AIServiceImpl) StartAutoCloseTicker() {
	ticker := time.NewTicker(10 * time.Minute)
	go func() {
		for {
			select {
			case <-ticker.C:
				threshold := time.Now().Add(-24 * time.Hour).UTC()
				closedCount, err := s.repo.CloseInactiveSessions(context.Background(), threshold)
				if err != nil {
					s.log.Error("failed to close inactive ai sessions", "error", err)
				} else if closedCount > 0 {
					s.log.Info("background job closed inactive ai sessions", "count", closedCount)
				}
			case <-s.stopTicker:
				ticker.Stop()
				return
			}
		}
	}()
}

func (s *AIServiceImpl) StopTicker() {
	close(s.stopTicker)
}

// anonymizePrompt replaces patient name and UUIDs to protect patient health information (PHI)
func (s *AIServiceImpl) anonymizePrompt(msg, fullName, userID, patientID string) string {
	anonymized := msg

	// Replace UUIDs (case-insensitive)
	uuidRegex := regexp.MustCompile(`(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	anonymized = uuidRegex.ReplaceAllString(anonymized, "[UUID]")

	// Replace full name and specific names > 2 characters
	if fullName != "" {
		names := strings.Fields(fullName)
		// First try case-insensitive replacement of full name
		regFullName := regexp.MustCompile("(?i)" + regexp.QuoteMeta(fullName))
		anonymized = regFullName.ReplaceAllString(anonymized, "[PATIENT]")

		// Replace individual names > 2 letters
		for _, name := range names {
			if len(name) > 2 {
				regName := regexp.MustCompile("(?i)" + regexp.QuoteMeta(name))
				anonymized = regName.ReplaceAllString(anonymized, "[PATIENT]")
			}
		}
	}

	// Replace IDs specifically if found
	if userID != "" {
		regUser := regexp.MustCompile("(?i)" + regexp.QuoteMeta(userID))
		anonymized = regUser.ReplaceAllString(anonymized, "[UUID]")
	}
	if patientID != "" {
		regPat := regexp.MustCompile("(?i)" + regexp.QuoteMeta(patientID))
		anonymized = regPat.ReplaceAllString(anonymized, "[UUID]")
	}

	return anonymized
}
