package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appointmentDto "github.com/timurdianradhasejati/telemed_hub/internal/appointment/dto"
	appointmentService "github.com/timurdianradhasejati/telemed_hub/internal/appointment/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/model"
	doctorDTO "github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
	patientDto "github.com/timurdianradhasejati/telemed_hub/internal/patient/dto"
)

type MockConsultationRepository struct {
	mock.Mock
}

func (m *MockConsultationRepository) Create(ctx context.Context, cons *model.Consultation) error {
	args := m.Called(ctx, cons)
	return args.Error(0)
}

func (m *MockConsultationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Consultation, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Consultation), args.Error(1)
}

func (m *MockConsultationRepository) GetByAppointmentID(ctx context.Context, aptID uuid.UUID) (*model.Consultation, error) {
	args := m.Called(ctx, aptID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Consultation), args.Error(1)
}

func (m *MockConsultationRepository) Update(ctx context.Context, cons *model.Consultation) error {
	args := m.Called(ctx, cons)
	return args.Error(0)
}

func (m *MockConsultationRepository) GetRoomDetails(ctx context.Context, consultationID uuid.UUID) (*model.RoomDetails, error) {
	args := m.Called(ctx, consultationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.RoomDetails), args.Error(1)
}

func (m *MockConsultationRepository) SaveMessage(ctx context.Context, msg *model.ConsultationMessage) error {
	args := m.Called(ctx, msg)
	return args.Error(0)
}

func (m *MockConsultationRepository) ListMessages(ctx context.Context, consultationID uuid.UUID) ([]*model.ConsultationMessage, error) {
	args := m.Called(ctx, consultationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ConsultationMessage), args.Error(1)
}

type MockAppointmentService struct {
	mock.Mock
}

func (m *MockAppointmentService) Book(ctx context.Context, patientUserID uuid.UUID, req appointmentDto.CreateAppointmentRequest) (*appointmentDto.AppointmentResponse, error) {
	args := m.Called(ctx, patientUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appointmentDto.AppointmentResponse), args.Error(1)
}

func (m *MockAppointmentService) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID, roles []string) (*appointmentDto.AppointmentResponse, error) {
	args := m.Called(ctx, id, userID, roles)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appointmentDto.AppointmentResponse), args.Error(1)
}

func (m *MockAppointmentService) List(ctx context.Context, userID uuid.UUID, roles []string, statusFilter string) ([]*appointmentDto.AppointmentResponse, error) {
	args := m.Called(ctx, userID, roles, statusFilter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*appointmentDto.AppointmentResponse), args.Error(1)
}

func (m *MockAppointmentService) Cancel(ctx context.Context, id uuid.UUID, userID uuid.UUID, req appointmentDto.CancelAppointmentRequest) error {
	args := m.Called(ctx, id, userID, req)
	return args.Error(0)
}

func (m *MockAppointmentService) Reschedule(ctx context.Context, id uuid.UUID, userID uuid.UUID, req appointmentDto.RescheduleAppointmentRequest) (*appointmentDto.AppointmentResponse, error) {
	args := m.Called(ctx, id, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appointmentDto.AppointmentResponse), args.Error(1)
}

func (m *MockAppointmentService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockAppointmentService) SetConsultationService(consSvc appointmentService.ConsultationServiceClient) {
	m.Called(consSvc)
}

func (m *MockAppointmentService) RunAppointmentReminderJob(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

type MockDoctorService struct {
	mock.Mock
}

func (m *MockDoctorService) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*doctorDTO.DoctorResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) GetProfileByID(ctx context.Context, id uuid.UUID) (*doctorDTO.DoctorResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) UpdateProfile(ctx context.Context, userID uuid.UUID, req doctorDTO.UpdateDoctorRequest) (*doctorDTO.DoctorResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) VerifyDoctor(ctx context.Context, adminUserID uuid.UUID, doctorID uuid.UUID, ipAddress string, userAgent string) error {
	args := m.Called(ctx, adminUserID, doctorID, ipAddress, userAgent)
	return args.Error(0)
}

func (m *MockDoctorService) ListDoctors(ctx context.Context, specialty *string, onlyVerified bool, sortBy string, order string, page int, limit int) ([]*doctorDTO.DoctorResponse, int, error) {
	args := m.Called(ctx, specialty, onlyVerified, sortBy, order, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*doctorDTO.DoctorResponse), args.Int(1), args.Error(2)
}

func (m *MockDoctorService) AddAvailability(ctx context.Context, doctorUserID uuid.UUID, req doctorDTO.CreateAvailabilityRequest) (*doctorDTO.AvailabilityResponse, error) {
	args := m.Called(ctx, doctorUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.AvailabilityResponse), args.Error(1)
}

func (m *MockDoctorService) AddAvailabilityBulk(ctx context.Context, doctorUserID uuid.UUID, req doctorDTO.CreateAvailabilityBulkRequest) (*doctorDTO.CreateAvailabilityBulkResponse, error) {
	args := m.Called(ctx, doctorUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.CreateAvailabilityBulkResponse), args.Error(1)
}

func (m *MockDoctorService) RemoveAvailability(ctx context.Context, doctorUserID uuid.UUID, slotID uuid.UUID) error {
	args := m.Called(ctx, doctorUserID, slotID)
	return args.Error(0)
}

func (m *MockDoctorService) GetAvailability(ctx context.Context, doctorID uuid.UUID, startTimeStr, endTimeStr string, isBooked *bool) ([]*doctorDTO.AvailabilityResponse, error) {
	args := m.Called(ctx, doctorID, startTimeStr, endTimeStr, isBooked)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*doctorDTO.AvailabilityResponse), args.Error(1)
}

func (m *MockDoctorService) InvalidateAvailabilityCache(ctx context.Context, doctorID uuid.UUID) error {
	args := m.Called(ctx, doctorID)
	return args.Error(0)
}

func (m *MockDoctorService) CreateReview(ctx context.Context, consultationID, doctorID, patientID, creatorUserID uuid.UUID, patientName string, req doctorDTO.CreateReviewRequest) (*doctorDTO.ReviewResponse, error) {
	args := m.Called(ctx, consultationID, doctorID, patientID, creatorUserID, patientName, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.ReviewResponse), args.Error(1)
}

func (m *MockDoctorService) GetReviewByConsultationID(ctx context.Context, consultationID uuid.UUID) (*doctorDTO.ReviewResponse, error) {
	args := m.Called(ctx, consultationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*doctorDTO.ReviewResponse), args.Error(1)
}

func (m *MockDoctorService) GetDoctorReviews(ctx context.Context, doctorID uuid.UUID, page int, limit int) (*doctorDTO.DoctorReviewsResponse, int, error) {
	args := m.Called(ctx, doctorID, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).(*doctorDTO.DoctorReviewsResponse), args.Int(1), args.Error(2)
}

type MockPatientService struct {
	mock.Mock
}

func (m *MockPatientService) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*patientDto.PatientResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*patientDto.PatientResponse), args.Error(1)
}

func (m *MockPatientService) GetProfileByID(ctx context.Context, id uuid.UUID) (*patientDto.PatientResponse, error) {
	args := m.Called(ctx, id)
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

func TestConsultationService_Start(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	doctorUserID := uuid.New()

	t.Run("Success starting consultation", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "scheduled",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		aptResp := &appointmentDto.AppointmentResponse{
			ID:       aptID.String(),
			DoctorID: uuid.New().String(),
		}
		mockApt.On("GetByID", ctx, aptID, doctorUserID, []string{"doctor"}).Return(aptResp, nil).Once()

		mockRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Consultation) bool {
			return c.Status == "in_progress" && c.StartedAt != nil
		})).Return(nil).Once()

		mockApt.On("UpdateStatus", ctx, aptID, "in_progress").Return(nil).Once()

		resp, err := svc.Start(ctx, consID, doctorUserID)
		assert.NoError(t, err)
		assert.Equal(t, "in_progress", resp.Status)
		assert.NotNil(t, resp.StartedAt)

		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
	})

	t.Run("Idempotent re-start when already in_progress", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "in_progress",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		aptResp := &appointmentDto.AppointmentResponse{
			ID:        aptID.String(),
			DoctorID:  uuid.New().String(),
			PatientID: uuid.New().String(),
		}
		mockApt.On("GetByID", ctx, aptID, doctorUserID, []string{"doctor"}).Return(aptResp, nil).Once()

		resp, err := svc.Start(ctx, consID, doctorUserID)
		assert.NoError(t, err)
		assert.Equal(t, "in_progress", resp.Status)
		assert.Equal(t, aptResp.DoctorID, resp.DoctorID)
		assert.Equal(t, aptResp.PatientID, resp.PatientID)

		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
	})

	t.Run("Invalid state transition error", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "completed",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		aptResp := &appointmentDto.AppointmentResponse{
			ID: aptID.String(),
		}
		mockApt.On("GetByID", ctx, aptID, doctorUserID, []string{"doctor"}).Return(aptResp, nil).Once()

		resp, err := svc.Start(ctx, consID, doctorUserID)
		assert.Nil(t, resp)
		assert.ErrorIs(t, err, ErrInvalidTransition)

		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
	})
}

func TestConsultationService_Complete(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	doctorUserID := uuid.New()

	t.Run("Success completing consultation", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "in_progress",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		aptResp := &appointmentDto.AppointmentResponse{
			ID: aptID.String(),
		}
		mockApt.On("GetByID", ctx, aptID, doctorUserID, []string{"doctor"}).Return(aptResp, nil).Once()

		mockRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Consultation) bool {
			return c.Status == "completed" && c.EndedAt != nil
		})).Return(nil).Once()

		mockApt.On("UpdateStatus", ctx, aptID, "completed").Return(nil).Once()

		resp, err := svc.Complete(ctx, consID, doctorUserID)
		assert.NoError(t, err)
		assert.Equal(t, "completed", resp.Status)

		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
	})
}

func TestConsultationService_GetRoom(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	doctorUserID := uuid.New()
	patientUserID := uuid.New()
	otherUserID := uuid.New()

	cons := &model.Consultation{
		ID:            consID,
		AppointmentID: aptID,
		Status:        "in_progress",
	}

	roomDetails := &model.RoomDetails{
		ConsultationID: consID,
		AppointmentID:  aptID,
		Status:         "in_progress",
		DoctorUserID:   doctorUserID,
		DoctorName:     "Dr. Jane",
		PatientUserID:  patientUserID,
		PatientName:    "John Doe",
	}

	t.Run("Success as doctor", func(t *testing.T) {
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()
		mockRepo.On("ListMessages", ctx, consID).Return([]*model.ConsultationMessage{}, nil).Once()

		resp, err := svc.GetRoom(ctx, consID, doctorUserID, []string{"doctor"})
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, consID.String(), resp.ConsultationID)
		assert.Equal(t, "Dr. Jane", resp.Doctor.Name)
		assert.Equal(t, "John Doe", resp.Patient.Name)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Success as patient", func(t *testing.T) {
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()
		mockRepo.On("ListMessages", ctx, consID).Return([]*model.ConsultationMessage{}, nil).Once()

		resp, err := svc.GetRoom(ctx, consID, patientUserID, []string{"patient"})
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, consID.String(), resp.ConsultationID)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Unauthorized user", func(t *testing.T) {
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()

		resp, err := svc.GetRoom(ctx, consID, otherUserID, []string{"patient"})
		assert.Nil(t, resp)
		assert.ErrorIs(t, err, ErrUnauthorized)

		mockRepo.AssertExpectations(t)
	})
}

func TestConsultationService_SendMessage(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	doctorUserID := uuid.New()
	patientUserID := uuid.New()
	otherUserID := uuid.New()

	roomDetails := &model.RoomDetails{
		ConsultationID: consID,
		AppointmentID:  aptID,
		Status:         "in_progress",
		DoctorUserID:   doctorUserID,
		DoctorName:     "Dr. Jane",
		PatientUserID:  patientUserID,
		PatientName:    "John Doe",
	}

	t.Run("Success from doctor", func(t *testing.T) {
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()
		mockRepo.On("SaveMessage", ctx, mock.MatchedBy(func(m *model.ConsultationMessage) bool {
			return m.SenderID == doctorUserID && m.SenderRole == "doctor" && m.Message == "Hello patient"
		})).Return(nil).Once()

		req := dto.SendMessageRequest{
			Message: "Hello patient",
		}
		resp, err := svc.SendMessage(ctx, consID, doctorUserID, req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "doctor", resp.SenderRole)
		assert.Equal(t, "Dr. Jane", resp.SenderName)
		assert.Equal(t, "Hello patient", resp.Message)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Success from patient", func(t *testing.T) {
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()
		mockRepo.On("SaveMessage", ctx, mock.MatchedBy(func(m *model.ConsultationMessage) bool {
			return m.SenderID == patientUserID && m.SenderRole == "patient" && m.Message == "Hello doctor"
		})).Return(nil).Once()

		req := dto.SendMessageRequest{
			Message: "Hello doctor",
		}
		resp, err := svc.SendMessage(ctx, consID, patientUserID, req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "patient", resp.SenderRole)
		assert.Equal(t, "John Doe", resp.SenderName)
		assert.Equal(t, "Hello doctor", resp.Message)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Unauthorized sender", func(t *testing.T) {
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()

		req := dto.SendMessageRequest{
			Message: "Intruder message",
		}
		resp, err := svc.SendMessage(ctx, consID, otherUserID, req)
		assert.Nil(t, resp)
		assert.ErrorIs(t, err, ErrUnauthorized)

		mockRepo.AssertExpectations(t)
	})
}

func TestConsultationService_ListMessages(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	doctorUserID := uuid.New()
	patientUserID := uuid.New()
	otherUserID := uuid.New()

	roomDetails := &model.RoomDetails{
		ConsultationID: consID,
		AppointmentID:  aptID,
		Status:         "in_progress",
		DoctorUserID:   doctorUserID,
		DoctorName:     "Dr. Jane",
		PatientUserID:  patientUserID,
		PatientName:    "John Doe",
	}

	msgs := []*model.ConsultationMessage{
		{
			ID:             uuid.New(),
			ConsultationID: consID,
			SenderID:       doctorUserID,
			SenderName:     "Dr. Jane",
			SenderRole:     "doctor",
			Message:        "Hello",
			CreatedAt:      time.Now(),
		},
	}

	t.Run("Success list messages", func(t *testing.T) {
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()
		mockRepo.On("ListMessages", ctx, consID).Return(msgs, nil).Once()

		resp, err := svc.ListMessages(ctx, consID, patientUserID, []string{"patient"})
		assert.NoError(t, err)
		assert.Len(t, resp, 1)
		assert.Equal(t, "Hello", resp[0].Message)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Unauthorized user", func(t *testing.T) {
		mockRepo.On("GetRoomDetails", ctx, consID).Return(roomDetails, nil).Once()

		resp, err := svc.ListMessages(ctx, consID, otherUserID, []string{"patient"})
		assert.Nil(t, resp)
		assert.ErrorIs(t, err, ErrUnauthorized)

		mockRepo.AssertExpectations(t)
	})
}

func TestConsultationService_Reviews(t *testing.T) {
	mockRepo := new(MockConsultationRepository)
	mockApt := new(MockAppointmentService)
	mockDoc := new(MockDoctorService)
	mockPat := new(MockPatientService)
	svc := NewConsultationService(mockRepo, mockApt, mockDoc, mockPat)

	ctx := context.Background()
	consID := uuid.New()
	aptID := uuid.New()
	patientUserID := uuid.New()
	patientID := uuid.New()
	doctorID := uuid.New()

	comment := "Dokter sangat komunikatif"
	req := doctorDTO.CreateReviewRequest{
		Rating:  5,
		Comment: &comment,
	}

	t.Run("Fails if consultation not completed", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "in_progress",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		resp, err := svc.CreateReview(ctx, consID, patientUserID, req)
		assert.ErrorIs(t, err, ErrConsultationNotCompleted)
		assert.Nil(t, resp)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Fails if caller is not the patient", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "completed",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		otherPatientID := uuid.New()
		apptResp := &appointmentDto.AppointmentResponse{
			ID:        aptID.String(),
			PatientID: otherPatientID.String(),
			DoctorID:  doctorID.String(),
		}
		mockApt.On("GetByID", ctx, aptID, patientUserID, []string{"patient"}).Return(apptResp, nil).Once()

		patProfile := &patientDto.PatientResponse{
			ID:       patientID.String(),
			FullName: "Budi Santoso",
		}
		mockPat.On("GetProfileByUserID", ctx, patientUserID).Return(patProfile, nil).Once()

		resp, err := svc.CreateReview(ctx, consID, patientUserID, req)
		assert.ErrorIs(t, err, ErrUnauthorized)
		assert.Nil(t, resp)
		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
		mockPat.AssertExpectations(t)
	})

	t.Run("Fails if already reviewed", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "completed",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		apptResp := &appointmentDto.AppointmentResponse{
			ID:        aptID.String(),
			PatientID: patientID.String(),
			DoctorID:  doctorID.String(),
		}
		mockApt.On("GetByID", ctx, aptID, patientUserID, []string{"patient"}).Return(apptResp, nil).Once()

		patProfile := &patientDto.PatientResponse{
			ID:       patientID.String(),
			FullName: "Budi Santoso",
		}
		mockPat.On("GetProfileByUserID", ctx, patientUserID).Return(patProfile, nil).Once()

		existingReview := &doctorDTO.ReviewResponse{
			ID:     uuid.New().String(),
			Rating: 4,
		}
		mockDoc.On("GetReviewByConsultationID", ctx, consID).Return(existingReview, nil).Once()

		resp, err := svc.CreateReview(ctx, consID, patientUserID, req)
		assert.ErrorIs(t, err, ErrAlreadyReviewed)
		assert.Nil(t, resp)
		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
		mockPat.AssertExpectations(t)
		mockDoc.AssertExpectations(t)
	})

	t.Run("Success create review", func(t *testing.T) {
		cons := &model.Consultation{
			ID:            consID,
			AppointmentID: aptID,
			Status:        "completed",
		}
		mockRepo.On("GetByID", ctx, consID).Return(cons, nil).Once()

		apptResp := &appointmentDto.AppointmentResponse{
			ID:        aptID.String(),
			PatientID: patientID.String(),
			DoctorID:  doctorID.String(),
		}
		mockApt.On("GetByID", ctx, aptID, patientUserID, []string{"patient"}).Return(apptResp, nil).Once()

		patProfile := &patientDto.PatientResponse{
			ID:       patientID.String(),
			FullName: "Budi Santoso",
		}
		mockPat.On("GetProfileByUserID", ctx, patientUserID).Return(patProfile, nil).Once()

		mockDoc.On("GetReviewByConsultationID", ctx, consID).Return(nil, errors.New("not found")).Once()

		createdReview := &doctorDTO.ReviewResponse{
			ID:             uuid.New().String(),
			ConsultationID: consID.String(),
			DoctorID:       doctorID.String(),
			PatientID:      patientID.String(),
			PatientName:    "Budi Santoso",
			Rating:         5,
			Comment:        &comment,
		}
		mockDoc.On("CreateReview", ctx, consID, doctorID, patientID, patientUserID, "Budi Santoso", req).Return(createdReview, nil).Once()

		resp, err := svc.CreateReview(ctx, consID, patientUserID, req)
		require.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, 5, resp.Rating)
		assert.Equal(t, "Budi Santoso", resp.PatientName)
		mockRepo.AssertExpectations(t)
		mockApt.AssertExpectations(t)
		mockPat.AssertExpectations(t)
		mockDoc.AssertExpectations(t)
	})
}


