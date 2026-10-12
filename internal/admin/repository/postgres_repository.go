package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/model"
)

var (
	ErrUserNotFound = errors.New("user not found")
	ErrRoleNotFound = errors.New("role not found")
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) ListAuditLogs(ctx context.Context, filter dto.ListAuditLogsFilter) ([]*model.AuditLog, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	argCount := 1

	if filter.ActorID != nil && *filter.ActorID != "" {
		actorID, err := uuid.Parse(*filter.ActorID)
		if err != nil {
			return nil, 0, fmt.Errorf("invalid actor_id filter: %w", err)
		}
		where += fmt.Sprintf(" AND actor_id = $%d", argCount)
		args = append(args, actorID)
		argCount++
	}

	if filter.Action != nil && *filter.Action != "" {
		where += fmt.Sprintf(" AND action = $%d", argCount)
		args = append(args, *filter.Action)
		argCount++
	}

	if filter.TargetType != nil && *filter.TargetType != "" {
		where += fmt.Sprintf(" AND target_type = $%d", argCount)
		args = append(args, *filter.TargetType)
		argCount++
	}

	if filter.From != nil && *filter.From != "" {
		fromTime, err := time.Parse("2006-01-02", *filter.From)
		if err != nil {
			fromTime, err = time.Parse(time.RFC3339, *filter.From)
		}
		if err == nil {
			where += fmt.Sprintf(" AND created_at >= $%d", argCount)
			args = append(args, fromTime.UTC())
			argCount++
		}
	}

	if filter.To != nil && *filter.To != "" {
		toTime, err := time.Parse("2006-01-02", *filter.To)
		if err != nil {
			toTime, err = time.Parse(time.RFC3339, *filter.To)
		}
		if err == nil {
			if len(*filter.To) == 10 {
				toTime = toTime.Add(24 * time.Hour)
			}
			where += fmt.Sprintf(" AND created_at < $%d", argCount)
			args = append(args, toTime.UTC())
			argCount++
		}
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs %s", where)
	var totalItems int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalItems)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf(`
		SELECT id, actor_id, action, target_type, target_id, ip_address, user_agent, metadata, created_at
		FROM audit_logs
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*model.AuditLog
	for rows.Next() {
		var l model.AuditLog
		err := rows.Scan(
			&l.ID, &l.ActorID, &l.Action, &l.TargetType, &l.TargetID,
			&l.IPAddress, &l.UserAgent, &l.Metadata, &l.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}
		logs = append(logs, &l)
	}

	return logs, totalItems, nil
}

func (r *PostgresRepository) ListUsers(ctx context.Context, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error) {
	where := "WHERE u.deleted_at IS NULL"
	args := []any{}
	argCount := 1

	if filter.Status != nil && *filter.Status != "" {
		where += fmt.Sprintf(" AND u.status = $%d", argCount)
		args = append(args, *filter.Status)
		argCount++
	}

	if filter.Search != nil && *filter.Search != "" {
		searchPattern := "%" + *filter.Search + "%"
		where += fmt.Sprintf(" AND (u.full_name ILIKE $%d OR u.email ILIKE $%d)", argCount, argCount)
		args = append(args, searchPattern)
		argCount++
	}

	if filter.Role != nil && *filter.Role != "" {
		where += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND r2.name = $%d)", argCount)
		args = append(args, *filter.Role)
		argCount++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(DISTINCT u.id) FROM users u %s", where)
	var totalItems int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalItems)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf(`
		SELECT 
			u.id, u.email, u.full_name, u.phone_number, u.status, u.is_verified, u.created_at,
			COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		%s
		GROUP BY u.id
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*dto.UserResponse
	for rows.Next() {
		var (
			id          uuid.UUID
			email       string
			fullName    string
			phone       *string
			status      string
			isVerified  bool
			createdAt   time.Time
			roles       []string
		)

		if err := rows.Scan(&id, &email, &fullName, &phone, &status, &isVerified, &createdAt, &roles); err != nil {
			return nil, 0, fmt.Errorf("failed to scan user row: %w", err)
		}

		users = append(users, &dto.UserResponse{
			ID:          id.String(),
			Email:       email,
			FullName:    fullName,
			PhoneNumber: phone,
			Status:      status,
			IsVerified:  isVerified,
			Roles:       roles,
			CreatedAt:   createdAt.Format(time.RFC3339),
		})
	}

	return users, totalItems, nil
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*dto.UserResponse, error) {
	query := `
		SELECT 
			u.id, u.email, u.full_name, u.phone_number, u.status, u.is_verified, u.created_at,
			COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.id = $1 AND u.deleted_at IS NULL
		GROUP BY u.id
	`
	var (
		userID     uuid.UUID
		email      string
		fullName   string
		phone      *string
		status     string
		isVerified bool
		createdAt  time.Time
		roles      []string
	)

	err := r.db.QueryRow(ctx, query, id).Scan(&userID, &email, &fullName, &phone, &status, &isVerified, &createdAt, &roles)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}

	return &dto.UserResponse{
		ID:          userID.String(),
		Email:       email,
		FullName:    fullName,
		PhoneNumber: phone,
		Status:      status,
		IsVerified:  isVerified,
		Roles:       roles,
		CreatedAt:   createdAt.Format(time.RFC3339),
	}, nil
}

func (r *PostgresRepository) UpdateUserStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`
	cmd, err := r.db.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update user status: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *PostgresRepository) CheckEmailExists(ctx context.Context, email string, excludeUserID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND id != $2 AND deleted_at IS NULL)`
	var exists bool
	err := r.db.QueryRow(ctx, query, email, excludeUserID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return exists, nil
}

func (r *PostgresRepository) UpdateUser(ctx context.Context, id uuid.UUID, email, fullName string, phoneNumber *string) error {
	query := `
		UPDATE users 
		SET email = $1, full_name = $2, phone_number = $3, updated_at = NOW() 
		WHERE id = $4 AND deleted_at IS NULL
	`
	cmd, err := r.db.Exec(ctx, query, email, fullName, phoneNumber, id)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *PostgresRepository) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) ([]string, error) {
	var roleID uuid.UUID
	err := r.db.QueryRow(ctx, "SELECT id FROM roles WHERE name = $1", roleName).Scan(&roleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("failed to get role id: %w", err)
	}

	// Insert into user_roles
	insertQuery := `
		INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
		ON CONFLICT (user_id, role_id) DO NOTHING
	`
	if _, err := r.db.Exec(ctx, insertQuery, userID, roleID); err != nil {
		return nil, fmt.Errorf("failed to assign role to user: %w", err)
	}

	// Fetch updated roles
	query := `
		SELECT r.name 
		FROM user_roles ur 
		JOIN roles r ON ur.role_id = r.id 
		WHERE ur.user_id = $1
		ORDER BY r.name
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			roles = append(roles, name)
		}
	}

	return roles, nil
}

func (r *PostgresRepository) GetAdminStats(ctx context.Context) (*dto.AdminStatsResponse, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
			(SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL),
			(SELECT COUNT(*) FROM doctors WHERE deleted_at IS NULL),
			(SELECT COUNT(*) FROM doctors WHERE is_credential_verified = true AND deleted_at IS NULL),
			(SELECT COUNT(*) FROM doctors WHERE is_credential_verified = false AND deleted_at IS NULL),
			(SELECT COUNT(*) FROM consultations),
			(SELECT COUNT(*) FROM orders),
			(SELECT COUNT(*) FROM audit_logs)
	`
	stats := &dto.AdminStatsResponse{}
	err := r.db.QueryRow(ctx, query).Scan(
		&stats.TotalUsers,
		&stats.TotalPatients,
		&stats.TotalDoctors,
		&stats.VerifiedDoctors,
		&stats.PendingDoctors,
		&stats.TotalConsultations,
		&stats.TotalOrders,
		&stats.TotalAuditLogs,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch admin stats: %w", err)
	}

	return stats, nil
}

func (r *PostgresRepository) CreateAuditLog(ctx context.Context, actorID uuid.UUID, action, targetType string, targetID uuid.UUID, ip, ua string, metadata map[string]any) error {
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, ip_address, user_agent, metadata, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err = r.db.Exec(ctx, query, actorID, action, targetType, targetID, ip, ua, metaJSON)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}
	return nil
}
