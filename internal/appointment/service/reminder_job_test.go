package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/timurdianradhasejati/telemed_hub/internal/appointment/model"
	patientDto "github.com/timurdianradhasejati/telemed_hub/internal/patient/dto"
	notifDto "github.com/timurdianradhasejati/telemed_hub/internal/notification/dto"
)

type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) PublishNotification(ctx context.Context, userID uuid.UUID, channel string, typeStr string, payload map[string]any) error {
	args := m.Called(ctx, userID, channel, typeStr, payload)
	return args.Error(0)
}

func (m *MockNotificationService) CheckReminderSent(ctx context.Context, appointmentID uuid.UUID) (bool, error) {
	args := m.Called(ctx, appointmentID)
	return args.Bool(0), args.Error(1)
}

func (m *MockNotificationService) ListNotifications(ctx context.Context, userID uuid.UUID, status *string, page, limit int) ([]*notifDto.NotificationResponse, int, error) {
	return nil, 0, nil
}

func (m *MockNotificationService) MarkAsRead(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return nil
}

func TestAppointmentService_RunAppointmentReminderJob(t *testing.T) {
	mockRepo := new(MockAppointmentRepository)
	mockPatient := new(MockPatientService)
	mockDoctor := new(MockDoctorService)
	mockWallet := new(MockWalletService)
	mockNotif := new(MockNotificationService)

	svc := NewAppointmentService(mockRepo, mockPatient, mockDoctor, mockWallet, mockNotif, 60, nil)

	ctx := context.Background()
	patientID := uuid.New()
	patientUserID := uuid.New()
	doctorID := uuid.New()
	aptID := uuid.New()

	t.Run("Send reminder successfully when not already sent", func(t *testing.T) {
		apt := &model.Appointment{
			ID:          aptID,
			PatientID:   patientID,
			DoctorID:    doctorID,
			Status:      "confirmed",
			ScheduledAt: time.Now().Add(12 * time.Hour),
		}

		mockRepo.On("GetAppointmentsByScheduledTimeRange", mock.Anything, mock.Anything, mock.Anything, "confirmed").Return([]*model.Appointment{apt}, nil).Once()
		mockNotif.On("CheckReminderSent", mock.Anything, aptID).Return(false, nil).Once()

		patProfile := &patientDto.PatientResponse{
			ID:       patientID.String(),
			UserID:   patientUserID.String(),
			FullName: "Alice Wonder",
		}
		mockPatient.On("GetProfileByID", mock.Anything, patientID).Return(patProfile, nil).Once()

		mockNotif.On("PublishNotification", mock.Anything, patientUserID, "email", "appointment_reminder", mock.MatchedBy(func(payload map[string]any) bool {
			return payload["appointment_id"] == aptID.String() && payload["patient_name"] == "Alice Wonder"
		})).Return(nil).Once()

		err := svc.RunAppointmentReminderJob(ctx)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
		mockNotif.AssertExpectations(t)
		mockPatient.AssertExpectations(t)
	})

	t.Run("Skip reminder when already sent", func(t *testing.T) {
		apt := &model.Appointment{
			ID:          aptID,
			PatientID:   patientID,
			DoctorID:    doctorID,
			Status:      "confirmed",
			ScheduledAt: time.Now().Add(12 * time.Hour),
		}

		mockRepo.On("GetAppointmentsByScheduledTimeRange", mock.Anything, mock.Anything, mock.Anything, "confirmed").Return([]*model.Appointment{apt}, nil).Once()
		mockNotif.On("CheckReminderSent", mock.Anything, aptID).Return(true, nil).Once()

		err := svc.RunAppointmentReminderJob(ctx)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
		mockNotif.AssertExpectations(t)
	})
}
