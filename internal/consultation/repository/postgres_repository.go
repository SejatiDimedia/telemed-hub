package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/model"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, cons *model.Consultation) error {
	if cons.ID == uuid.Nil {
		cons.ID = uuid.New()
	}
	cons.CreatedAt = time.Now().UTC()
	cons.UpdatedAt = cons.CreatedAt

	query := `
		INSERT INTO consultations (id, appointment_id, status, notes, started_at, ended_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.db.Exec(ctx, query, cons.ID, cons.AppointmentID, cons.Status, cons.Notes, cons.StartedAt, cons.EndedAt, cons.CreatedAt, cons.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert consultation: %w", err)
	}

	return nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Consultation, error) {
	query := `
		SELECT id, appointment_id, status, notes, started_at, ended_at, created_at, updated_at
		FROM consultations
		WHERE id = $1`

	var c model.Consultation
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.AppointmentID, &c.Status, &c.Notes, &c.StartedAt, &c.EndedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConsultationNotFound
		}
		return nil, fmt.Errorf("failed to fetch consultation by ID: %w", err)
	}

	return &c, nil
}

func (r *PostgresRepository) GetByAppointmentID(ctx context.Context, aptID uuid.UUID) (*model.Consultation, error) {
	query := `
		SELECT id, appointment_id, status, notes, started_at, ended_at, created_at, updated_at
		FROM consultations
		WHERE appointment_id = $1`

	var c model.Consultation
	err := r.db.QueryRow(ctx, query, aptID).Scan(
		&c.ID, &c.AppointmentID, &c.Status, &c.Notes, &c.StartedAt, &c.EndedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConsultationNotFound
		}
		return nil, fmt.Errorf("failed to fetch consultation by appointment ID: %w", err)
	}

	return &c, nil
}

func (r *PostgresRepository) Update(ctx context.Context, cons *model.Consultation) error {
	cons.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE consultations
		SET status = $1, notes = $2, started_at = $3, ended_at = $4, updated_at = $5
		WHERE id = $6`

	_, err := r.db.Exec(ctx, query, cons.Status, cons.Notes, cons.StartedAt, cons.EndedAt, cons.UpdatedAt, cons.ID)
	if err != nil {
		return fmt.Errorf("failed to update consultation: %w", err)
	}

	return nil
}

func (r *PostgresRepository) GetRoomDetails(ctx context.Context, consultationID uuid.UUID) (*model.RoomDetails, error) {
	query := `
		SELECT 
			c.id, c.appointment_id, c.status, c.notes,
			d.id, doc_u.id, doc_u.full_name, doc_u.profile_picture_url, spec.name,
			pat.id, pat_u.id, pat_u.full_name, pat_u.profile_picture_url, pat.gender, pat.blood_type, pat.date_of_birth
		FROM consultations c
		JOIN appointments a ON c.appointment_id = a.id
		JOIN doctors d ON a.doctor_id = d.id
		JOIN users doc_u ON d.user_id = doc_u.id
		LEFT JOIN specialties spec ON d.specialty_id = spec.id
		JOIN patients pat ON a.patient_id = pat.id
		JOIN users pat_u ON pat.user_id = pat_u.id
		WHERE c.id = $1`

	var rd model.RoomDetails
	err := r.db.QueryRow(ctx, query, consultationID).Scan(
		&rd.ConsultationID, &rd.AppointmentID, &rd.Status, &rd.Notes,
		&rd.DoctorID, &rd.DoctorUserID, &rd.DoctorName, &rd.DoctorAvatar, &rd.DoctorSpecialty,
		&rd.PatientID, &rd.PatientUserID, &rd.PatientName, &rd.PatientAvatar, &rd.PatientGender, &rd.PatientBlood, &rd.PatientDOB,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConsultationNotFound
		}
		return nil, fmt.Errorf("failed to fetch consultation room details: %w", err)
	}

	return &rd, nil
}

func (r *PostgresRepository) SaveMessage(ctx context.Context, msg *model.ConsultationMessage) error {
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO consultation_messages (id, consultation_id, sender_id, message, attachment_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.Exec(ctx, query, msg.ID, msg.ConsultationID, msg.SenderID, msg.Message, msg.AttachmentURL, msg.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to save consultation message: %w", err)
	}

	return nil
}

func (r *PostgresRepository) ListMessages(ctx context.Context, consultationID uuid.UUID) ([]*model.ConsultationMessage, error) {
	query := `
		SELECT 
			m.id, m.consultation_id, m.sender_id, u.full_name, COALESCE(r.name, 'user'), m.message, m.attachment_url, m.created_at
		FROM consultation_messages m
		JOIN users u ON m.sender_id = u.id
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE m.consultation_id = $1
		ORDER BY m.created_at ASC`

	rows, err := r.db.Query(ctx, query, consultationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list consultation messages: %w", err)
	}
	defer rows.Close()

	var messages []*model.ConsultationMessage
	for rows.Next() {
		var msg model.ConsultationMessage
		if err := rows.Scan(
			&msg.ID, &msg.ConsultationID, &msg.SenderID, &msg.SenderName, &msg.SenderRole, &msg.Message, &msg.AttachmentURL, &msg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan consultation message: %w", err)
		}
		messages = append(messages, &msg)
	}

	return messages, nil
}
