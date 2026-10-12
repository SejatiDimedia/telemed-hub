package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/model"
)

type MockAdminRepo struct {
	mock.Mock
}

func (m *MockAdminRepo) ListAuditLogs(ctx context.Context, filter dto.ListAuditLogsFilter) ([]*model.AuditLog, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.AuditLog), args.Int(1), args.Error(2)
}

func (m *MockAdminRepo) ListUsers(ctx context.Context, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*dto.UserResponse), args.Int(1), args.Error(2)
}

func (m *MockAdminRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*dto.UserResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UserResponse), args.Error(1)
}

func (m *MockAdminRepo) UpdateUserStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockAdminRepo) UpdateUser(ctx context.Context, id uuid.UUID, email, fullName string, phoneNumber *string) error {
	args := m.Called(ctx, id, email, fullName, phoneNumber)
	return args.Error(0)
}

func (m *MockAdminRepo) CheckEmailExists(ctx context.Context, email string, excludeUserID uuid.UUID) (bool, error) {
	args := m.Called(ctx, email, excludeUserID)
	return args.Bool(0), args.Error(1)
}

func (m *MockAdminRepo) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) ([]string, error) {
	args := m.Called(ctx, userID, roleName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockAdminRepo) GetAdminStats(ctx context.Context) (*dto.AdminStatsResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.AdminStatsResponse), args.Error(1)
}

func (m *MockAdminRepo) CreateAuditLog(ctx context.Context, actorID uuid.UUID, action, targetType string, targetID uuid.UUID, ip, ua string, metadata map[string]any) error {
	args := m.Called(ctx, actorID, action, targetType, targetID, ip, ua, metadata)
	return args.Error(0)
}

func TestAdminService_RBAC(t *testing.T) {
	mockRepo := new(MockAdminRepo)
	svc := NewAdminService(mockRepo)

	actorID := uuid.New()
	targetID := uuid.New()

	// 1. Doctor role cannot list users
	_, _, err := svc.ListUsers(context.Background(), actorID, []string{"doctor"}, dto.ListUsersFilter{})
	assert.ErrorIs(t, err, ErrUnauthorized)

	// 2. Patient role cannot get stats
	_, err = svc.GetAdminStats(context.Background(), actorID, []string{"patient"})
	assert.ErrorIs(t, err, ErrUnauthorized)

	// 3. Admin cannot suspend own account
	_, err = svc.SuspendUser(context.Background(), actorID, []string{"admin"}, actorID, dto.SuspendUserRequest{Status: "suspended"}, "127.0.0.1", "curl")
	assert.ErrorIs(t, err, ErrSelfModification)

	// 4. Admin cannot assign invalid role
	_, err = svc.AssignRole(context.Background(), actorID, []string{"admin"}, targetID, dto.AssignRoleRequest{Role: "patient"}, "127.0.0.1", "curl")
	assert.ErrorIs(t, err, ErrInvalidRole)
}

func TestAdminService_SuccessFlows(t *testing.T) {
	mockRepo := new(MockAdminRepo)
	svc := NewAdminService(mockRepo)

	actorID := uuid.New()
	targetID := uuid.New()

	// Stats
	expectedStats := &dto.AdminStatsResponse{TotalUsers: 5}
	mockRepo.On("GetAdminStats", mock.Anything).Return(expectedStats, nil).Once()
	stats, err := svc.GetAdminStats(context.Background(), actorID, []string{"admin"})
	assert.NoError(t, err)
	assert.Equal(t, 5, stats.TotalUsers)

	// Assign Role
	mockRepo.On("AssignRole", mock.Anything, targetID, "pharmacy_staff").Return([]string{"patient", "pharmacy_staff"}, nil).Once()
	mockRepo.On("CreateAuditLog", mock.Anything, actorID, "user.role_assigned", "users", targetID, "127.0.0.1", "curl", mock.Anything).Return(nil).Once()
	roleResp, err := svc.AssignRole(context.Background(), actorID, []string{"admin"}, targetID, dto.AssignRoleRequest{Role: "pharmacy_staff"}, "127.0.0.1", "curl")
	assert.NoError(t, err)
	assert.Contains(t, roleResp.Roles, "pharmacy_staff")

	// Update User - Success
	existingUser := &dto.UserResponse{
		ID:       targetID.String(),
		Email:    "old@example.com",
		FullName: "Old Name",
	}
	updatedUser := &dto.UserResponse{
		ID:       targetID.String(),
		Email:    "new@example.com",
		FullName: "New Name",
	}
	mockRepo.On("GetUserByID", mock.Anything, targetID).Return(existingUser, nil).Once()
	mockRepo.On("CheckEmailExists", mock.Anything, "new@example.com", targetID).Return(false, nil).Once()
	mockRepo.On("UpdateUser", mock.Anything, targetID, "new@example.com", "New Name", mock.Anything).Return(nil).Once()
	mockRepo.On("CreateAuditLog", mock.Anything, actorID, "user.updated", "users", targetID, "127.0.0.1", "curl", mock.Anything).Return(nil).Once()
	mockRepo.On("GetUserByID", mock.Anything, targetID).Return(updatedUser, nil).Once()

	res, err := svc.UpdateUser(context.Background(), actorID, []string{"admin"}, targetID, dto.UpdateUserRequest{
		Email:    "new@example.com",
		FullName: "New Name",
	}, "127.0.0.1", "curl")
	assert.NoError(t, err)
	assert.Equal(t, "new@example.com", res.Email)
	assert.Equal(t, "New Name", res.FullName)

	// Update User - Duplicate Email Error
	mockRepo.On("GetUserByID", mock.Anything, targetID).Return(existingUser, nil).Once()
	mockRepo.On("CheckEmailExists", mock.Anything, "taken@example.com", targetID).Return(true, nil).Once()
	_, err = svc.UpdateUser(context.Background(), actorID, []string{"admin"}, targetID, dto.UpdateUserRequest{
		Email:    "taken@example.com",
		FullName: "Any Name",
	}, "127.0.0.1", "curl")
	assert.ErrorIs(t, err, ErrEmailAlreadyExists)

	mockRepo.AssertExpectations(t)
}
