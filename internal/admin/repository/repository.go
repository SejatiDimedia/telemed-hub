package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/model"
)

type AdminRepository interface {
	ListAuditLogs(ctx context.Context, filter dto.ListAuditLogsFilter) ([]*model.AuditLog, int, error)
	ListUsers(ctx context.Context, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*dto.UserResponse, error)
	UpdateUserStatus(ctx context.Context, id uuid.UUID, status string) error
	UpdateUser(ctx context.Context, id uuid.UUID, email, fullName string, phoneNumber *string) error
	CheckEmailExists(ctx context.Context, email string, excludeUserID uuid.UUID) (bool, error)
	AssignRole(ctx context.Context, userID uuid.UUID, roleName string) ([]string, error)
	GetAdminStats(ctx context.Context) (*dto.AdminStatsResponse, error)
	CreateAuditLog(ctx context.Context, actorID uuid.UUID, action, targetType string, targetID uuid.UUID, ip, ua string, metadata map[string]any) error
}
