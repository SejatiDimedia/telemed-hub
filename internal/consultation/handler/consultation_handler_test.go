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

	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/service"
	"github.com/timurdianradhasejati/telemed_hub/pkg/logger"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type MockConsultationService struct {
	mock.Mock
}

func (m *MockConsultationService) CreateConsultation(ctx context.Context, appointmentID uuid.UUID) error {
	args := m.Called(ctx, appointmentID)
	return args.Error(0)
}

func (m *MockConsultationService) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationResponse, error) {
	args := m.Called(ctx, id, userID, roles)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ConsultationResponse), args.Error(1)
}

func (m *MockConsultationService) Start(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error) {
	args := m.Called(ctx, id, doctorUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ConsultationResponse), args.Error(1)
}

func (m *MockConsultationService) Complete(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error) {
	args := m.Called(ctx, id, doctorUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ConsultationResponse), args.Error(1)
}

func (m *MockConsultationService) UpdateNotes(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID, notes string) (*dto.ConsultationResponse, error) {
	args := m.Called(ctx, id, doctorUserID, notes)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ConsultationResponse), args.Error(1)
}

func (m *MockConsultationService) CancelConsultation(ctx context.Context, appointmentID uuid.UUID) error {
	args := m.Called(ctx, appointmentID)
	return args.Error(0)
}

func (m *MockConsultationService) GetRoom(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationRoomResponse, error) {
	args := m.Called(ctx, consultationID, userID, roles)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ConsultationRoomResponse), args.Error(1)
}

func (m *MockConsultationService) SendMessage(ctx context.Context, consultationID uuid.UUID, senderID uuid.UUID, req dto.SendMessageRequest) (*dto.MessageResponse, error) {
	args := m.Called(ctx, consultationID, senderID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.MessageResponse), args.Error(1)
}

func (m *MockConsultationService) ListMessages(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) ([]dto.MessageResponse, error) {
	args := m.Called(ctx, consultationID, userID, roles)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.MessageResponse), args.Error(1)
}

func TestConsultationHandler_Start(t *testing.T) {
	mockSvc := new(MockConsultationService)
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewConsultationHandler(mockSvc, cfg, nil, log)

	r := chi.NewRouter()
	r.Post("/consultations/{id}/start", h.Start)

	consID := uuid.New()
	doctorUserID := uuid.New()

	t.Run("Success start consultation", func(t *testing.T) {
		startedStr := "2026-07-04T10:00:00Z"
		expectedResp := &dto.ConsultationResponse{
			ID:            consID.String(),
			AppointmentID: uuid.New().String(),
			Status:        "in_progress",
			StartedAt:     &startedStr,
		}

		mockSvc.On("Start", mock.Anything, consID, doctorUserID).Return(expectedResp, nil).Once()

		req, _ := http.NewRequest(http.MethodPost, "/consultations/"+consID.String()+"/start", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, doctorUserID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"doctor"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success bool                     `json:"success"`
			Data    dto.ConsultationResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Equal(t, "in_progress", envelope.Data.Status)
		mockSvc.AssertExpectations(t)
	})

	t.Run("Invalid state transition returns 422", func(t *testing.T) {
		mockSvc.On("Start", mock.Anything, consID, doctorUserID).Return(nil, service.ErrInvalidTransition).Once()

		req, _ := http.NewRequest(http.MethodPost, "/consultations/"+consID.String()+"/start", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, doctorUserID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"doctor"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
		mockSvc.AssertExpectations(t)
	})
}

func TestConsultationHandler_GetRoom(t *testing.T) {
	mockSvc := new(MockConsultationService)
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewConsultationHandler(mockSvc, cfg, nil, log)

	r := chi.NewRouter()
	r.Get("/consultations/{id}/room", h.GetRoom)

	consID := uuid.New()
	userID := uuid.New()

	t.Run("Success get room details", func(t *testing.T) {
		expectedResp := &dto.ConsultationRoomResponse{
			ConsultationID: consID.String(),
			Status:         "in_progress",
			Doctor: dto.ConsultationParticipant{
				UserID: userID.String(),
				Name:   "Dr. John",
				Role:   "doctor",
			},
			Patient: dto.ConsultationParticipant{
				UserID: uuid.New().String(),
				Name:   "Jane Doe",
				Role:   "patient",
			},
		}

		mockSvc.On("GetRoom", mock.Anything, consID, userID, []string{"doctor"}).Return(expectedResp, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/consultations/"+consID.String()+"/room", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"doctor"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success bool                         `json:"success"`
			Data    dto.ConsultationRoomResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Equal(t, consID.String(), envelope.Data.ConsultationID)
		mockSvc.AssertExpectations(t)
	})

	t.Run("Unauthorized get room details", func(t *testing.T) {
		mockSvc.On("GetRoom", mock.Anything, consID, userID, []string{"doctor"}).Return(nil, service.ErrUnauthorized).Once()

		req, _ := http.NewRequest(http.MethodGet, "/consultations/"+consID.String()+"/room", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"doctor"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusForbidden, rec.Code)
		mockSvc.AssertExpectations(t)
	})
}

func TestConsultationHandler_Messages(t *testing.T) {
	mockSvc := new(MockConsultationService)
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewConsultationHandler(mockSvc, cfg, nil, log)

	r := chi.NewRouter()
	r.Post("/consultations/{id}/messages", h.SendMessage)
	r.Get("/consultations/{id}/messages", h.ListMessages)

	consID := uuid.New()
	userID := uuid.New()

	t.Run("Success send message", func(t *testing.T) {
		sendReq := dto.SendMessageRequest{
			Message: "Hello doctor",
		}
		expectedResp := &dto.MessageResponse{
			ID:             uuid.New().String(),
			ConsultationID: consID.String(),
			SenderID:       userID.String(),
			SenderName:     "Jane Doe",
			SenderRole:     "patient",
			Message:        "Hello doctor",
		}

		mockSvc.On("SendMessage", mock.Anything, consID, userID, sendReq).Return(expectedResp, nil).Once()

		bodyBytes, _ := json.Marshal(sendReq)
		req, _ := http.NewRequest(http.MethodPost, "/consultations/"+consID.String()+"/messages", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"patient"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusCreated, rec.Code)
		var envelope struct {
			Success bool                `json:"success"`
			Data    dto.MessageResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Equal(t, "Hello doctor", envelope.Data.Message)
		mockSvc.AssertExpectations(t)
	})

	t.Run("Success list messages", func(t *testing.T) {
		expectedResp := []dto.MessageResponse{
			{
				ID:             uuid.New().String(),
				ConsultationID: consID.String(),
				SenderID:       userID.String(),
				SenderName:     "Jane Doe",
				SenderRole:     "patient",
				Message:        "Hello doctor",
			},
		}

		mockSvc.On("ListMessages", mock.Anything, consID, userID, []string{"patient"}).Return(expectedResp, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/consultations/"+consID.String()+"/messages", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"patient"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success bool                  `json:"success"`
			Data    []dto.MessageResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Len(t, envelope.Data, 1)
		mockSvc.AssertExpectations(t)
	})
}

