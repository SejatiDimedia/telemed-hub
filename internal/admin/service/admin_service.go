package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/model"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/repository"
)

var (
	ErrUnauthorized     = errors.New("unauthorized: only admins can perform this action")
	ErrInvalidRole      = errors.New("invalid role: only pharmacy_staff or admin can be assigned")
	ErrSelfModification = errors.New("cannot suspend own admin account")
)

type AdminService interface {
	ListAuditLogs(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListAuditLogsFilter) ([]*dto.AuditLogResponse, int, error)
	ListUsers(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error)
	GetUserByID(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID) (*dto.UserResponse, error)
	SuspendUser(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.SuspendUserRequest, ip, ua string) (*dto.UserResponse, error)
	AssignRole(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.AssignRoleRequest, ip, ua string) (*dto.AssignRoleResponse, error)
	GetAdminStats(ctx context.Context, actorID uuid.UUID, roles []string) (*dto.AdminStatsResponse, error)
}

type AdminServiceImpl struct {
	repo repository.AdminRepository
}

func NewAdminService(repo repository.AdminRepository) *AdminServiceImpl {
	return &AdminServiceImpl{repo: repo}
}

func hasAdminRole(roles []string) bool {
	for _, r := range roles {
		if r == "admin" {
			return true
		}
	}
	return false
}

func (s *AdminServiceImpl) ListAuditLogs(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListAuditLogsFilter) ([]*dto.AuditLogResponse, int, error) {
	if !hasAdminRole(roles) {
		return nil, 0, ErrUnauthorized
	}

	list, total, err := s.repo.ListAuditLogs(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	respList := make([]*dto.AuditLogResponse, 0, len(list))
	for _, l := range list {
		respList = append(respList, toResponse(l))
	}
	return respList, total, nil
}

func (s *AdminServiceImpl) ListUsers(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error) {
	if !hasAdminRole(roles) {
		return nil, 0, ErrUnauthorized
	}
	return s.repo.ListUsers(ctx, filter)
}

func (s *AdminServiceImpl) GetUserByID(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID) (*dto.UserResponse, error) {
	if !hasAdminRole(roles) {
		return nil, ErrUnauthorized
	}
	return s.repo.GetUserByID(ctx, targetUserID)
}

func (s *AdminServiceImpl) SuspendUser(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.SuspendUserRequest, ip, ua string) (*dto.UserResponse, error) {
	if !hasAdminRole(roles) {
		return nil, ErrUnauthorized
	}
	if actorID == targetUserID {
		return nil, ErrSelfModification
	}

	status := "suspended"
	if req.Status == "active" {
		status = "active"
	}

	if err := s.repo.UpdateUserStatus(ctx, targetUserID, status); err != nil {
		return nil, err
	}

	action := "user.suspended"
	if status == "active" {
		action = "user.activated"
	}
	_ = s.repo.CreateAuditLog(ctx, actorID, action, "users", targetUserID, ip, ua, map[string]any{
		"new_status": status,
		"reason":     req.Reason,
	})

	return s.repo.GetUserByID(ctx, targetUserID)
}

func (s *AdminServiceImpl) AssignRole(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.AssignRoleRequest, ip, ua string) (*dto.AssignRoleResponse, error) {
	if !hasAdminRole(roles) {
		return nil, ErrUnauthorized
	}
	if req.Role != "pharmacy_staff" && req.Role != "admin" {
		return nil, ErrInvalidRole
	}

	updatedRoles, err := s.repo.AssignRole(ctx, targetUserID, req.Role)
	if err != nil {
		return nil, err
	}

	_ = s.repo.CreateAuditLog(ctx, actorID, "user.role_assigned", "users", targetUserID, ip, ua, map[string]any{
		"role_assigned": req.Role,
	})

	return &dto.AssignRoleResponse{
		UserID: targetUserID.String(),
		Roles:  updatedRoles,
	}, nil
}

func (s *AdminServiceImpl) GetAdminStats(ctx context.Context, actorID uuid.UUID, roles []string) (*dto.AdminStatsResponse, error) {
	if !hasAdminRole(roles) {
		return nil, ErrUnauthorized
	}
	return s.repo.GetAdminStats(ctx)
}

func toResponse(l *model.AuditLog) *dto.AuditLogResponse {
	return &dto.AuditLogResponse{
		ID:         l.ID.String(),
		ActorID:    l.ActorID.String(),
		Action:     l.Action,
		TargetType: l.TargetType,
		TargetID:   l.TargetID.String(),
		IPAddress:  l.IPAddress,
		UserAgent:  l.UserAgent,
		Metadata:   l.Metadata,
		CreatedAt:  l.CreatedAt.Format(time.RFC3339),
	}
}
