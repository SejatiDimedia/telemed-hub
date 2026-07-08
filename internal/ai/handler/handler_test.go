package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type MockAIService struct {
	mock.Mock
}

func (m *MockAIService) CreateSession(ctx context.Context, patientUserID uuid.UUID) (*dto.CreateSessionResponse, error) {
	args := m.Called(ctx, patientUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.CreateSessionResponse), args.Error(1)
}

func (m *MockAIService) PostMessage(ctx context.Context, patientUserID uuid.UUID, sessionID uuid.UUID, message string) (*dto.TriageResponse, error) {
	args := m.Called(ctx, patientUserID, sessionID, message)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.TriageResponse), args.Error(1)
}

func (m *MockAIService) GetSession(ctx context.Context, userID uuid.UUID, roles []string, sessionID uuid.UUID) (*dto.SessionResponse, error) {
	args := m.Called(ctx, userID, roles, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.SessionResponse), args.Error(1)
}

func (m *MockAIService) ListSessions(ctx context.Context, patientUserID uuid.UUID) ([]*dto.SessionResponse, error) {
	args := m.Called(ctx, patientUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.SessionResponse), args.Error(1)
}

func (m *MockAIService) CloseInactiveSessions(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func newTestHandler(svc *MockAIService) (*AIHandler, chi.Router) {
	cfg := &config.Config{}
	h := NewAIHandler(svc, cfg, nil)

	r := chi.NewRouter()
	r.Post("/ai/sessions", h.CreateSession)
	r.Post("/ai/sessions/{id}/messages", h.PostMessage)
	r.Get("/ai/sessions/{id}", h.GetSession)
	r.Get("/ai/sessions", h.ListSessions)

	return h, r
}

func withAuth(req *http.Request, userID uuid.UUID, roles []string) *http.Request {
	ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
	ctx = context.WithValue(ctx, middleware.RolesContextKey, roles)
	return req.WithContext(ctx)
}

func TestAIHandler_CreateSession_Success(t *testing.T) {
	mockSvc := new(MockAIService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()
	sessionID := uuid.New()

	mockSvc.On("CreateSession", mock.Anything, userID).Return(&dto.CreateSessionResponse{
		ID:        sessionID.String(),
		PatientID: uuid.New().String(),
		Status:    "active",
	}, nil).Once()

	req, _ := http.NewRequest(http.MethodPost, "/ai/sessions", nil)
	req = withAuth(req, userID, []string{"patient"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)

	var res struct {
		Success bool                       `json:"success"`
		Data    dto.CreateSessionResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&res))
	assert.True(t, res.Success)
	assert.Equal(t, sessionID.String(), res.Data.ID)
	mockSvc.AssertExpectations(t)
}

func TestAIHandler_CreateSession_Conflict(t *testing.T) {
	mockSvc := new(MockAIService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()

	mockSvc.On("CreateSession", mock.Anything, userID).Return(nil, service.ErrActiveSessionExists).Once()

	req, _ := http.NewRequest(http.MethodPost, "/ai/sessions", nil)
	req = withAuth(req, userID, []string{"patient"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusConflict, rec.Code)

	var res struct {
		Success   bool   `json:"success"`
		ErrorCode string `json:"error_code"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&res))
	assert.False(t, res.Success)
	assert.Equal(t, "ACTIVE_SESSION_EXISTS", res.ErrorCode)
	mockSvc.AssertExpectations(t)
}

func TestAIHandler_PostMessage_Success(t *testing.T) {
	mockSvc := new(MockAIService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()
	sessionID := uuid.New()

	mockSvc.On("PostMessage", mock.Anything, userID, sessionID, "I feel dizzy and weak").Return(&dto.TriageResponse{
		SuggestedUrgency:   "medium",
		SuggestedSpecialty: "general_practitioner",
		Disclaimer:         "Non-diagnostic",
		SessionID:          sessionID.String(),
	}, nil).Once()

	reqBody, _ := json.Marshal(dto.PostMessageRequest{Message: "I feel dizzy and weak"})
	req, _ := http.NewRequest(http.MethodPost, "/ai/sessions/"+sessionID.String()+"/messages", bytes.NewBuffer(reqBody))
	req = withAuth(req, userID, []string{"patient"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)

	var res struct {
		Success bool               `json:"success"`
		Data    dto.TriageResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&res))
	assert.True(t, res.Success)
	assert.Equal(t, "medium", res.Data.SuggestedUrgency)
	mockSvc.AssertExpectations(t)
}
