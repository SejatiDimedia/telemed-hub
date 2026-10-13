package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	appointmentService "github.com/timurdianradhasejati/telemed_hub/internal/appointment/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/model"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/repository"
	doctorDTO "github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
	doctorService "github.com/timurdianradhasejati/telemed_hub/internal/doctor/service"
	patientService "github.com/timurdianradhasejati/telemed_hub/internal/patient/service"
)

type ConsultationServiceImpl struct {
	repo           repository.ConsultationRepository
	appointmentSvc appointmentService.AppointmentService
	doctorSvc      doctorService.DoctorService
	patientSvc     patientService.PatientService
}

func NewConsultationService(
	repo repository.ConsultationRepository,
	appointmentSvc appointmentService.AppointmentService,
	doctorSvc doctorService.DoctorService,
	patientSvc patientService.PatientService,
) *ConsultationServiceImpl {
	return &ConsultationServiceImpl{
		repo:           repo,
		appointmentSvc: appointmentSvc,
		doctorSvc:      doctorSvc,
		patientSvc:     patientSvc,
	}
}

func (s *ConsultationServiceImpl) getConsultation(ctx context.Context, id uuid.UUID, userID uuid.UUID, roles []string) (*model.Consultation, error) {
	cons, err := s.repo.GetByID(ctx, id)
	if err == nil {
		return cons, nil
	}
	cons, errApt := s.repo.GetByAppointmentID(ctx, id)
	if errApt == nil {
		return cons, nil
	}
	appt, errAppt := s.appointmentSvc.GetByID(ctx, id, userID, roles)
	if errAppt == nil {
		aptID, errParse := uuid.Parse(appt.ID)
		if errParse == nil {
			cons = &model.Consultation{
				ID:            uuid.New(),
				AppointmentID: aptID,
				Status:        "scheduled",
			}
			if errCreate := s.repo.Create(ctx, cons); errCreate == nil {
				return cons, nil
			}
		}
	}
	return nil, err
}

func (s *ConsultationServiceImpl) CreateConsultation(ctx context.Context, appointmentID uuid.UUID) error {
	cons := &model.Consultation{
		ID:            uuid.New(),
		AppointmentID: appointmentID,
		Status:        "scheduled",
	}

	err := s.repo.Create(ctx, cons)
	if err != nil {
		return fmt.Errorf("failed to save consultation record: %w", err)
	}

	return nil
}

func (s *ConsultationServiceImpl) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationResponse, error) {
	cons, err := s.getConsultation(ctx, id, userID, roles)
	if err != nil {
		return nil, err
	}

	// Verify authorization by querying appointment (centralized authorization).
	// The appointment response also provides DoctorID and PatientID for downstream use.
	appt, err := s.appointmentSvc.GetByID(ctx, cons.AppointmentID, userID, roles)
	if err != nil {
		if errors.Is(err, appointmentService.ErrUnauthorized) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}

	resp := s.toResponse(cons)
	resp.DoctorID = appt.DoctorID
	resp.PatientID = appt.PatientID
	return resp, nil
}

func (s *ConsultationServiceImpl) Start(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error) {
	cons, err := s.getConsultation(ctx, id, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, err
	}

	// Verify the caller is the assigned doctor of the appointment
	appt, err := s.appointmentSvc.GetByID(ctx, cons.AppointmentID, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, ErrUnauthorized
	}

	// Idempotent: if already in_progress, return existing state
	if cons.Status == "in_progress" {
		resp := s.toResponse(cons)
		resp.DoctorID = appt.DoctorID
		resp.PatientID = appt.PatientID
		return resp, nil
	}

	if cons.Status != "scheduled" {
		return nil, fmt.Errorf("%w: current status is %s, expected scheduled", ErrInvalidTransition, cons.Status)
	}

	now := time.Now().UTC()
	cons.Status = "in_progress"
	cons.StartedAt = &now

	err = s.repo.Update(ctx, cons)
	if err != nil {
		return nil, err
	}

	// Update corresponding appointment status to in_progress
	_ = s.appointmentSvc.UpdateStatus(ctx, cons.AppointmentID, "in_progress")

	resp := s.toResponse(cons)
	resp.DoctorID = appt.DoctorID
	resp.PatientID = appt.PatientID
	return resp, nil
}

func (s *ConsultationServiceImpl) Complete(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID) (*dto.ConsultationResponse, error) {
	cons, err := s.getConsultation(ctx, id, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, err
	}

	// Verify the caller is the assigned doctor of the appointment
	_, err = s.appointmentSvc.GetByID(ctx, cons.AppointmentID, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, ErrUnauthorized
	}

	// If already completed, return current state idempotently
	if cons.Status == "completed" {
		return s.toResponse(cons), nil
	}

	if cons.Status != "in_progress" {
		return nil, fmt.Errorf("%w: current status is %s, expected in_progress", ErrInvalidTransition, cons.Status)
	}

	now := time.Now().UTC()
	cons.Status = "completed"
	cons.EndedAt = &now

	err = s.repo.Update(ctx, cons)
	if err != nil {
		return nil, err
	}

	// Update corresponding appointment status to completed
	_ = s.appointmentSvc.UpdateStatus(ctx, cons.AppointmentID, "completed")

	return s.toResponse(cons), nil
}

func (s *ConsultationServiceImpl) UpdateNotes(ctx context.Context, id uuid.UUID, doctorUserID uuid.UUID, notes string) (*dto.ConsultationResponse, error) {
	cons, err := s.getConsultation(ctx, id, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, err
	}

	if cons.Status != "in_progress" && cons.Status != "completed" {
		return nil, fmt.Errorf("%w: current status is %s, expected in_progress or completed", ErrInvalidTransition, cons.Status)
	}

	// Verify doctor authorization
	_, err = s.appointmentSvc.GetByID(ctx, cons.AppointmentID, doctorUserID, []string{"doctor"})
	if err != nil {
		return nil, ErrUnauthorized
	}

	cons.Notes = &notes

	err = s.repo.Update(ctx, cons)
	if err != nil {
		return nil, err
	}

	return s.toResponse(cons), nil
}

func (s *ConsultationServiceImpl) CancelConsultation(ctx context.Context, appointmentID uuid.UUID) error {
	cons, err := s.repo.GetByAppointmentID(ctx, appointmentID)
	if err != nil {
		if errors.Is(err, repository.ErrConsultationNotFound) {
			return nil // no consultation to cancel
		}
		return err
	}

	if cons.Status == "cancelled" || cons.Status == "completed" {
		return nil
	}

	cons.Status = "cancelled"
	return s.repo.Update(ctx, cons)
}

func (s *ConsultationServiceImpl) GetRoom(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) (*dto.ConsultationRoomResponse, error) {
	cons, err := s.getConsultation(ctx, consultationID, userID, roles)
	if err != nil {
		return nil, err
	}

	rd, err := s.repo.GetRoomDetails(ctx, cons.ID)
	if err != nil {
		return nil, err
	}

	// Verify authorization: must be the assigned doctor, the patient, or an admin
	isAdmin := false
	for _, r := range roles {
		if r == "admin" {
			isAdmin = true
			break
		}
	}
	if !isAdmin && userID != rd.DoctorUserID && userID != rd.PatientUserID {
		return nil, ErrUnauthorized
	}

	msgs, err := s.repo.ListMessages(ctx, cons.ID)
	if err != nil {
		return nil, err
	}

	msgResponses := make([]dto.MessageResponse, 0, len(msgs))
	for _, m := range msgs {
		msgResponses = append(msgResponses, *s.toMessageResponse(m))
	}

	var dobStr *string
	if rd.PatientDOB != nil {
		dStr := rd.PatientDOB.Format("2006-01-02")
		dobStr = &dStr
	}

	patIDStr := rd.PatientID.String()
	docIDStr := rd.DoctorID.String()

	return &dto.ConsultationRoomResponse{
		ConsultationID: rd.ConsultationID.String(),
		AppointmentID:  rd.AppointmentID.String(),
		PatientID:      patIDStr,
		DoctorID:       docIDStr,
		Status:         rd.Status,
		Notes:          rd.Notes,
		Doctor: dto.ConsultationParticipant{
			UserID:            rd.DoctorUserID.String(),
			DoctorID:          &docIDStr,
			Name:              rd.DoctorName,
			Role:              "doctor",
			ProfilePictureURL: rd.DoctorAvatar,
			Specialty:         rd.DoctorSpecialty,
		},
		Patient: dto.ConsultationParticipant{
			UserID:            rd.PatientUserID.String(),
			PatientID:         &patIDStr,
			Name:              rd.PatientName,
			Role:              "patient",
			ProfilePictureURL: rd.PatientAvatar,
			Gender:            rd.PatientGender,
			BloodType:         rd.PatientBlood,
			DateOfBirth:       dobStr,
		},
		Messages: msgResponses,
	}, nil
}

func (s *ConsultationServiceImpl) SendMessage(ctx context.Context, consultationID uuid.UUID, senderID uuid.UUID, req dto.SendMessageRequest) (*dto.MessageResponse, error) {
	rd, err := s.repo.GetRoomDetails(ctx, consultationID)
	if err != nil {
		return nil, err
	}

	if senderID != rd.DoctorUserID && senderID != rd.PatientUserID {
		return nil, ErrUnauthorized
	}

	senderRole := "patient"
	senderName := rd.PatientName
	if senderID == rd.DoctorUserID {
		senderRole = "doctor"
		senderName = rd.DoctorName
	}

	msg := &model.ConsultationMessage{
		ID:             uuid.New(),
		ConsultationID: consultationID,
		SenderID:       senderID,
		SenderName:     senderName,
		SenderRole:     senderRole,
		Message:        req.Message,
		AttachmentURL:  req.AttachmentURL,
		CreatedAt:      time.Now().UTC(),
	}

	if err := s.repo.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}

	return s.toMessageResponse(msg), nil
}

func (s *ConsultationServiceImpl) ListMessages(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) ([]dto.MessageResponse, error) {
	rd, err := s.repo.GetRoomDetails(ctx, consultationID)
	if err != nil {
		return nil, err
	}

	isAdmin := false
	for _, r := range roles {
		if r == "admin" {
			isAdmin = true
			break
		}
	}
	if !isAdmin && userID != rd.DoctorUserID && userID != rd.PatientUserID {
		return nil, ErrUnauthorized
	}

	msgs, err := s.repo.ListMessages(ctx, consultationID)
	if err != nil {
		return nil, err
	}

	msgResponses := make([]dto.MessageResponse, 0, len(msgs))
	for _, m := range msgs {
		msgResponses = append(msgResponses, *s.toMessageResponse(m))
	}

	return msgResponses, nil
}

func (s *ConsultationServiceImpl) toMessageResponse(m *model.ConsultationMessage) *dto.MessageResponse {
	return &dto.MessageResponse{
		ID:             m.ID.String(),
		ConsultationID: m.ConsultationID.String(),
		SenderID:       m.SenderID.String(),
		SenderName:     m.SenderName,
		SenderRole:     m.SenderRole,
		Message:        m.Message,
		AttachmentURL:  m.AttachmentURL,
		CreatedAt:      m.CreatedAt.Format(time.RFC3339),
	}
}

func (s *ConsultationServiceImpl) toResponse(c *model.Consultation) *dto.ConsultationResponse {
	var startStr, endStr *string
	if c.StartedAt != nil {
		tStr := c.StartedAt.Format(time.RFC3339)
		startStr = &tStr
	}
	if c.EndedAt != nil {
		tStr := c.EndedAt.Format(time.RFC3339)
		endStr = &tStr
	}

	return &dto.ConsultationResponse{
		ID:            c.ID.String(),
		AppointmentID: c.AppointmentID.String(),
		Status:        c.Status,
		Notes:         c.Notes,
		StartedAt:     startStr,
		EndedAt:       endStr,
		CreatedAt:     c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     c.UpdatedAt.Format(time.RFC3339),
	}
}

func (s *ConsultationServiceImpl) CreateReview(ctx context.Context, consultationID uuid.UUID, patientUserID uuid.UUID, req doctorDTO.CreateReviewRequest) (*doctorDTO.ReviewResponse, error) {
	// 1. Get consultation
	cons, err := s.getConsultation(ctx, consultationID, patientUserID, []string{"patient"})
	if err != nil {
		return nil, ErrConsultationNotFound
	}

	// 2. Consultation must be in "completed" state
	if cons.Status != "completed" {
		return nil, ErrConsultationNotCompleted
	}

	// 3. Fetch appointment to verify patient ownership and get doctor/patient IDs
	appt, err := s.appointmentSvc.GetByID(ctx, cons.AppointmentID, patientUserID, []string{"patient"})
	if err != nil {
		return nil, ErrUnauthorized
	}

	// 4. Verify patient profile belongs to this patient
	patProfile, err := s.patientSvc.GetProfileByUserID(ctx, patientUserID)
	if err != nil {
		return nil, ErrUnauthorized
	}

	if appt.PatientID != patProfile.ID {
		return nil, ErrUnauthorized
	}

	// 5. Check if review already exists
	if _, err := s.doctorSvc.GetReviewByConsultationID(ctx, cons.ID); err == nil {
		return nil, ErrAlreadyReviewed
	}

	docUUID, err := uuid.Parse(appt.DoctorID)
	if err != nil {
		return nil, fmt.Errorf("invalid doctor uuid in appointment: %w", err)
	}

	patUUID, err := uuid.Parse(patProfile.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid patient uuid in profile: %w", err)
	}

	// 6. Delegate review creation to doctorSvc
	return s.doctorSvc.CreateReview(ctx, cons.ID, docUUID, patUUID, patientUserID, patProfile.FullName, req)
}

func (s *ConsultationServiceImpl) GetReview(ctx context.Context, consultationID uuid.UUID, userID uuid.UUID, roles []string) (*doctorDTO.ReviewResponse, error) {
	cons, err := s.getConsultation(ctx, consultationID, userID, roles)
	if err != nil {
		return nil, ErrConsultationNotFound
	}

	// Verify caller has access to consultation
	_, err = s.appointmentSvc.GetByID(ctx, cons.AppointmentID, userID, roles)
	if err != nil {
		return nil, ErrUnauthorized
	}

	return s.doctorSvc.GetReviewByConsultationID(ctx, cons.ID)
}

