package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/timurdianradhasejati/telemed_hub/internal/medical_record/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/medical_record/model"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, rec *model.MedicalRecord) error {
	now := time.Now().UTC()
	rec.CreatedAt = now
	rec.UpdatedAt = now

	query := `
		INSERT INTO medical_records (id, patient_id, consultation_id, record_type, content, file_id, created_at, updated_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(ctx, query,
		rec.ID, rec.PatientID, rec.ConsultationID, rec.RecordType, rec.Content, rec.FileID,
		rec.CreatedAt, rec.UpdatedAt, rec.CreatedBy,
	)
	if err != nil {
		return fmt.Errorf("failed to create medical record: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.MedicalRecord, error) {
	query := `
		SELECT 
			mr.id, mr.patient_id, mr.consultation_id, mr.record_type, mr.content, mr.file_id, 
			mr.created_at, mr.updated_at, mr.created_by, mr.updated_by,
			u.full_name AS doctor_name,
			s.name AS doctor_specialty
		FROM medical_records mr
		LEFT JOIN users u ON mr.created_by = u.id
		LEFT JOIN doctors d ON d.user_id = u.id
		LEFT JOIN specialties s ON d.specialty_id = s.id
		WHERE mr.id = $1 AND mr.deleted_at IS NULL
	`
	var m model.MedicalRecord
	err := r.db.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.PatientID, &m.ConsultationID, &m.RecordType, &m.Content, &m.FileID,
		&m.CreatedAt, &m.UpdatedAt, &m.CreatedBy, &m.UpdatedBy,
		&m.DoctorName, &m.DoctorSpecialty,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMedicalRecordNotFound
		}
		return nil, fmt.Errorf("failed to query medical record: %w", err)
	}
	return &m, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter dto.ListMedicalRecordsFilter) ([]*model.MedicalRecord, error) {
	query := `
		SELECT 
			mr.id, mr.patient_id, mr.consultation_id, mr.record_type, mr.content, mr.file_id, 
			mr.created_at, mr.updated_at, mr.created_by, mr.updated_by,
			u.full_name AS doctor_name,
			s.name AS doctor_specialty
		FROM medical_records mr
		LEFT JOIN users u ON mr.created_by = u.id
		LEFT JOIN doctors d ON d.user_id = u.id
		LEFT JOIN specialties s ON d.specialty_id = s.id
		WHERE mr.deleted_at IS NULL
	`
	args := []any{}
	argCount := 1

	if filter.PatientID != nil && *filter.PatientID != "" {
		patientID, err := uuid.Parse(*filter.PatientID)
		if err != nil {
			return nil, fmt.Errorf("invalid patient_id filter: %w", err)
		}
		query += fmt.Sprintf(" AND mr.patient_id = $%d", argCount)
		args = append(args, patientID)
		argCount++
	}

	if filter.RecordType != nil && *filter.RecordType != "" {
		query += fmt.Sprintf(" AND mr.record_type = $%d", argCount)
		args = append(args, *filter.RecordType)
		argCount++
	}

	query += " ORDER BY mr.created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list medical records: %w", err)
	}
	defer rows.Close()

	var records []*model.MedicalRecord
	for rows.Next() {
		var m model.MedicalRecord
		err := rows.Scan(
			&m.ID, &m.PatientID, &m.ConsultationID, &m.RecordType, &m.Content, &m.FileID,
			&m.CreatedAt, &m.UpdatedAt, &m.CreatedBy, &m.UpdatedBy,
			&m.DoctorName, &m.DoctorSpecialty,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan medical record: %w", err)
		}
		records = append(records, &m)
	}

	return records, nil
}

func (r *PostgresRepository) Update(ctx context.Context, rec *model.MedicalRecord) error {
	rec.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE medical_records
		SET record_type = $1, content = $2, file_id = $3, updated_at = $4, updated_by = $5
		WHERE id = $6 AND deleted_at IS NULL
	`
	tag, err := r.db.Exec(ctx, query,
		rec.RecordType, rec.Content, rec.FileID, rec.UpdatedAt, rec.UpdatedBy, rec.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update medical record: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrMedicalRecordNotFound
	}
	return nil
}

func (r *PostgresRepository) SoftDelete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	now := time.Now().UTC()
	query := `
		UPDATE medical_records
		SET deleted_at = $1, deleted_by = $2
		WHERE id = $3 AND deleted_at IS NULL
	`
	tag, err := r.db.Exec(ctx, query, now, deletedBy, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete medical record: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrMedicalRecordNotFound
	}
	return nil
}

func (r *PostgresRepository) HasTreatmentRelationship(ctx context.Context, doctorUserID, patientID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM appointments
			WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = $1)
			  AND patient_id = $2
			  AND status IN ('confirmed', 'in_progress', 'completed')
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, query, doctorUserID, patientID).Scan(&exists)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, fmt.Errorf("failed to check treatment relationship: %w", err)
	}
	return exists, nil
}
