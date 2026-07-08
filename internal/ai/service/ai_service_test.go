package service

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/model"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/repository"
	patientDto "github.com/timurdianradhasejati/telemed_hub/internal/patient/dto"
)

type MockAIRepository struct {
	mock.Mock
}

func (m *MockAIRepository) CreateSession(ctx context.Context, s *model.AISession) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockAIRepository) GetActiveSessionByPatientID(ctx context.Context, patientID uuid.UUID) (*model.AISession, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AISession), args.Error(1)
}

func (m *MockAIRepository) GetSessionByID(ctx context.Context, id uuid.UUID) (*model.AISession, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AISession), args.Error(1)
}

func (m *MockAIRepository) ListSessionsByPatientID(ctx context.Context, patientID uuid.UUID) ([]*model.AISession, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AISession), args.Error(1)
}

func (m *MockAIRepository) UpdateSessionUpdatedAt(ctx context.Context, id uuid.UUID, updatedAt time.Time) error {
	args := m.Called(ctx, id, updatedAt)
	return args.Error(0)
}

func (m *MockAIRepository) CloseSession(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockAIRepository) CreateSuggestion(ctx context.Context, s *model.AISuggestion) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockAIRepository) GetSuggestionsBySessionID(ctx context.Context, sessionID uuid.UUID) ([]*model.AISuggestion, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AISuggestion), args.Error(1)
}

func (m *MockAIRepository) CloseInactiveSessions(ctx context.Context, threshold time.Time) (int64, error) {
	args := m.Called(ctx, threshold)
	return int64(args.Int(0)), args.Error(1)
}

var _ repository.AIRepository = (*MockAIRepository)(nil)

type MockPatientService struct {
	mock.Mock
}

func (m *MockPatientService) GetProfileByID(ctx context.Context, id uuid.UUID) (*patientDto.PatientResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*patientDto.PatientResponse), args.Error(1)
}

func (m *MockPatientService) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*patientDto.PatientResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*patientDto.PatientResponse), args.Error(1)
}

func (m *MockPatientService) UpdateProfile(ctx context.Context, userID uuid.UUID, req patientDto.UpdatePatientRequest) (*patientDto.PatientResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*patientDto.PatientResponse), args.Error(1)
}

type MockLLMClient struct {
	mock.Mock
}

func (m *MockLLMClient) Triage(ctx context.Context, anonymizedSymptom string) (*dto.TriageResponse, error) {
	args := m.Called(ctx, anonymizedSymptom)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.TriageResponse), args.Error(1)
}

var _ LLMClient = (*MockLLMClient)(nil)

func TestAIService_CreateSession_Limits(t *testing.T) {
	mockRepo := new(MockAIRepository)
	mockPatient := new(MockPatientService)
	mockLLM := new(MockLLMClient)
	log := slog.New(slog.DiscardHandler)
	svc := NewAIService(mockRepo, mockLLM, mockPatient, log)

	userID := uuid.New()
	patientID := uuid.New()

	t.Run("Conflict: Active session already exists", func(t *testing.T) {
		patProfile := &patientDto.PatientResponse{ID: patientID.String(), UserID: userID.String()}
		mockPatient.On("GetProfileByUserID", mock.Anything, userID).Return(patProfile, nil).Once()
		mockRepo.On("GetActiveSessionByPatientID", mock.Anything, patientID).Return(&model.AISession{ID: uuid.New(), Status: "active"}, nil).Once()

		res, err := svc.CreateSession(context.Background(), userID)
		assert.Nil(t, res)
		assert.True(t, errors.Is(err, ErrActiveSessionExists))
		mockRepo.AssertExpectations(t)
		mockPatient.AssertExpectations(t)
	})
}

func TestAIService_PostMessage_PHIProtection(t *testing.T) {
	mockRepo := new(MockAIRepository)
	mockPatient := new(MockPatientService)
	mockLLM := new(MockLLMClient)
	log := slog.New(slog.DiscardHandler)
	svc := NewAIService(mockRepo, mockLLM, mockPatient, log)

	userID := uuid.New()
	patientID := uuid.New()
	sessionID := uuid.New()

	t.Run("Anonymize prompt: Strips name and UUID", func(t *testing.T) {
		patProfile := &patientDto.PatientResponse{
			ID:       patientID.String(),
			UserID:   userID.String(),
			FullName: "Alice Wonder",
		}
		mockPatient.On("GetProfileByUserID", mock.Anything, userID).Return(patProfile, nil).Once()

		sess := &model.AISession{
			ID:        sessionID,
			PatientID: patientID,
			Status:    "active",
		}
		mockRepo.On("GetSessionByID", mock.Anything, sessionID).Return(sess, nil).Once()

		// Verify Alice and UUID are replaced
		msgInput := "Hello, my name is Alice Wonder and my user ID is " + userID.String()
		expectedClean := "Hello, my name is [PATIENT] and my user ID is [UUID]"

		mockLLM.On("Triage", mock.Anything, expectedClean).Return(&dto.TriageResponse{
			SuggestedUrgency:   "low",
			SuggestedSpecialty: "general_practitioner",
		}, nil).Once()

		mockRepo.On("CreateSuggestion", mock.Anything, mock.Anything).Return(nil).Once()
		mockRepo.On("UpdateSessionUpdatedAt", mock.Anything, sessionID, mock.Anything).Return(nil).Once()

		res, err := svc.PostMessage(context.Background(), userID, sessionID, msgInput)
		assert.NoError(t, err)
		assert.Equal(t, "low", res.SuggestedUrgency)
		assert.Equal(t, "general_practitioner", res.SuggestedSpecialty)

		mockRepo.AssertExpectations(t)
		mockPatient.AssertExpectations(t)
		mockLLM.AssertExpectations(t)
	})
}
