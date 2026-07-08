package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func (s *AppointmentServiceImpl) RunAppointmentReminderJob(ctx context.Context) error {
	s.log.Info("starting appointment reminder background job run")

	start := time.Now().UTC()
	end := start.Add(24 * time.Hour)

	// Fetch confirmed appointments in the next 24 hours
	list, err := s.repo.GetAppointmentsByScheduledTimeRange(ctx, start, end, "confirmed")
	if err != nil {
		return fmt.Errorf("failed to fetch upcoming appointments: %w", err)
	}

	for _, apt := range list {
		// Check if reminder was already sent
		alreadySent, err := s.notificationSvc.CheckReminderSent(ctx, apt.ID)
		if err != nil {
			s.log.Error("failed to check if reminder was already sent", "appointment_id", apt.ID, "error", err)
			continue
		}

		if alreadySent {
			s.log.Debug("reminder already sent for appointment", "appointment_id", apt.ID)
			continue
		}

		// Resolve patient profile to get UserID and Name
		patProfile, err := s.patientSvc.GetProfileByID(ctx, apt.PatientID)
		if err != nil {
			s.log.Error("failed to resolve patient profile for reminder", "patient_id", apt.PatientID, "appointment_id", apt.ID, "error", err)
			continue
		}

		patientUserID, err := uuid.Parse(patProfile.UserID)
		if err != nil {
			s.log.Error("invalid patient user ID format", "user_id", patProfile.UserID, "appointment_id", apt.ID, "error", err)
			continue
		}

		s.log.Info("sending appointment reminder notification", "appointment_id", apt.ID, "user_id", patientUserID)

		// Dispatch notification
		err = s.notificationSvc.PublishNotification(ctx, patientUserID, "email", "appointment_reminder", map[string]any{
			"appointment_id": apt.ID.String(),
			"scheduled_at":   apt.ScheduledAt.Format(time.RFC3339),
			"patient_name":   patProfile.FullName,
		})
		if err != nil {
			return fmt.Errorf("failed to publish reminder notification for appointment %s: %w", apt.ID, err)
		}
	}

	s.log.Info("completed appointment reminder background job run successfully")
	return nil
}
