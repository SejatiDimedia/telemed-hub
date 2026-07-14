package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/model"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, med *model.Medicine) error {
	if med.ID == uuid.Nil {
		med.ID = uuid.New()
	}
	now := time.Now().UTC()
	med.CreatedAt = now
	med.UpdatedAt = now

	query := `
		INSERT INTO medicines (id, name, unit_price, stock_quantity, requires_prescription, created_at, updated_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		med.ID, med.Name, med.UnitPrice, med.StockQuantity, med.RequiresPrescription,
		med.CreatedAt, med.UpdatedAt, med.CreatedBy,
	)
	if err != nil {
		return fmt.Errorf("failed to create medicine: %w", err)
	}
	return nil
}

func (r *PostgresRepository) Update(ctx context.Context, med *model.Medicine) error {
	med.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE medicines
		SET name = $1, unit_price = $2, stock_quantity = $3, requires_prescription = $4, updated_at = $5, updated_by = $6
		WHERE id = $7 AND deleted_at IS NULL
	`
	tag, err := r.db.Exec(ctx, query,
		med.Name, med.UnitPrice, med.StockQuantity, med.RequiresPrescription, med.UpdatedAt, med.UpdatedBy, med.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update medicine: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrMedicineNotFound
	}
	return nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Medicine, error) {
	query := `
		SELECT id, name, unit_price, stock_quantity, requires_prescription, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
		FROM medicines
		WHERE id = $1 AND deleted_at IS NULL
	`
	var med model.Medicine
	err := r.db.QueryRow(ctx, query, id).Scan(
		&med.ID, &med.Name, &med.UnitPrice, &med.StockQuantity, &med.RequiresPrescription,
		&med.CreatedAt, &med.UpdatedAt, &med.CreatedBy, &med.UpdatedBy, &med.DeletedAt, &med.DeletedBy,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMedicineNotFound
		}
		return nil, fmt.Errorf("failed to get medicine by id: %w", err)
	}
	return &med, nil
}

func (r *PostgresRepository) GetByIDForUpdate(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*model.Medicine, error) {
	query := `
		SELECT id, name, unit_price, stock_quantity, requires_prescription, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
		FROM medicines
		WHERE id = $1 AND deleted_at IS NULL
		FOR UPDATE
	`
	var med model.Medicine
	var err error
	if tx != nil {
		err = tx.QueryRow(ctx, query, id).Scan(
			&med.ID, &med.Name, &med.UnitPrice, &med.StockQuantity, &med.RequiresPrescription,
			&med.CreatedAt, &med.UpdatedAt, &med.CreatedBy, &med.UpdatedBy, &med.DeletedAt, &med.DeletedBy,
		)
	} else {
		err = r.db.QueryRow(ctx, query, id).Scan(
			&med.ID, &med.Name, &med.UnitPrice, &med.StockQuantity, &med.RequiresPrescription,
			&med.CreatedAt, &med.UpdatedAt, &med.CreatedBy, &med.UpdatedBy, &med.DeletedAt, &med.DeletedBy,
		)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMedicineNotFound
		}
		return nil, fmt.Errorf("failed to get medicine by id for update: %w", err)
	}
	return &med, nil
}

func (r *PostgresRepository) List(ctx context.Context, nameFilter *string, reqPrescFilter *bool, page, limit int) ([]*model.Medicine, int, error) {
	var whereClauses []string
	var args []any
	argCount := 1

	// Always filter out soft-deleted items
	whereClauses = append(whereClauses, "deleted_at IS NULL")

	if nameFilter != nil && *nameFilter != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("name ILIKE $%d", argCount))
		args = append(args, "%"+*nameFilter+"%")
		argCount++
	}

	if reqPrescFilter != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("requires_prescription = $%d", argCount))
		args = append(args, *reqPrescFilter)
		argCount++
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM medicines %s", whereSQL)
	var totalItems int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalItems)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count medicines: %w", err)
	}

	if totalItems == 0 {
		return []*model.Medicine{}, 0, nil
	}

	// List query with pagination (order by created_at DESC as default)
	offset := (page - 1) * limit
	listQuery := fmt.Sprintf(`
		SELECT id, name, unit_price, stock_quantity, requires_prescription, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
		FROM medicines
		%s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query medicines list: %w", err)
	}
	defer rows.Close()

	var medicines []*model.Medicine
	for rows.Next() {
		var med model.Medicine
		err := rows.Scan(
			&med.ID, &med.Name, &med.UnitPrice, &med.StockQuantity, &med.RequiresPrescription,
			&med.CreatedAt, &med.UpdatedAt, &med.CreatedBy, &med.UpdatedBy, &med.DeletedAt, &med.DeletedBy,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan medicine: %w", err)
		}
		medicines = append(medicines, &med)
	}

	return medicines, totalItems, nil
}

func (r *PostgresRepository) SoftDelete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	now := time.Now().UTC()
	query := `
		UPDATE medicines
		SET deleted_at = $1, deleted_by = $2
		WHERE id = $3 AND deleted_at IS NULL
	`
	tag, err := r.db.Exec(ctx, query, now, deletedBy, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete medicine: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrMedicineNotFound
	}
	return nil
}

func (r *PostgresRepository) UpdateStock(ctx context.Context, tx pgx.Tx, id uuid.UUID, newStock int) error {
	now := time.Now().UTC()
	query := `
		UPDATE medicines
		SET stock_quantity = $1, updated_at = $2
		WHERE id = $3 AND deleted_at IS NULL
	`
	var err error
	var affected int64

	if tx != nil {
		tag, err := tx.Exec(ctx, query, newStock, now, id)
		if err == nil {
			affected = tag.RowsAffected()
		}
	} else {
		tag, err := r.db.Exec(ctx, query, newStock, now, id)
		if err == nil {
			affected = tag.RowsAffected()
		}
	}

	if err != nil {
		return fmt.Errorf("failed to update stock: %w", err)
	}
	if affected == 0 {
		return ErrMedicineNotFound
	}
	return nil
}

func (r *PostgresRepository) RecordMutation(ctx context.Context, tx pgx.Tx, mutation *model.StockMutation) error {
	if mutation.ID == uuid.Nil {
		mutation.ID = uuid.New()
	}
	if mutation.CreatedAt.IsZero() {
		mutation.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO stock_mutations (id, medicine_id, mutation_type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	var createdBy *uuid.UUID
	if mutation.CreatedBy != uuid.Nil {
		createdBy = &mutation.CreatedBy
	}

	args := []any{
		mutation.ID, mutation.MedicineID, mutation.MutationType, mutation.Quantity,
		mutation.StockBefore, mutation.StockAfter, mutation.ReferenceType,
		mutation.ReferenceID, mutation.Notes, createdBy, mutation.CreatedAt,
	}

	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, args...)
	} else {
		_, err = r.db.Exec(ctx, query, args...)
	}
	if err != nil {
		return fmt.Errorf("failed to record stock mutation: %w", err)
	}
	return nil
}

func (r *PostgresRepository) ListMutations(ctx context.Context, medicineID uuid.UUID, page, limit int) ([]*model.StockMutation, int, error) {
	// Count query
	countQuery := `SELECT COUNT(*) FROM stock_mutations WHERE medicine_id = $1`
	var totalItems int
	err := r.db.QueryRow(ctx, countQuery, medicineID).Scan(&totalItems)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count stock mutations: %w", err)
	}

	if totalItems == 0 {
		return []*model.StockMutation{}, 0, nil
	}

	offset := (page - 1) * limit
	listQuery := `
		SELECT id, medicine_id, mutation_type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by, created_at
		FROM stock_mutations
		WHERE medicine_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, listQuery, medicineID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query stock mutations: %w", err)
	}
	defer rows.Close()

	var mutations []*model.StockMutation
	for rows.Next() {
		var m model.StockMutation
		err := rows.Scan(
			&m.ID, &m.MedicineID, &m.MutationType, &m.Quantity,
			&m.StockBefore, &m.StockAfter, &m.ReferenceType, &m.ReferenceID,
			&m.Notes, &m.CreatedBy, &m.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan stock mutation: %w", err)
		}
		mutations = append(mutations, &m)
	}

	return mutations, totalItems, nil
}


