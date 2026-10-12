package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/pkg/logger"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type MockAdminService struct {
	mock.Mock
}

func (m *MockAdminService) ListAuditLogs(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListAuditLogsFilter) ([]*dto.AuditLogResponse, int, error) {
	args := m.Called(ctx, actorID, roles, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*dto.AuditLogResponse), args.Int(1), args.Error(2)
}

func (m *MockAdminService) ListUsers(ctx context.Context, actorID uuid.UUID, roles []string, filter dto.ListUsersFilter) ([]*dto.UserResponse, int, error) {
	args := m.Called(ctx, actorID, roles, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*dto.UserResponse), args.Int(1), args.Error(2)
}

func (m *MockAdminService) GetUserByID(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID) (*dto.UserResponse, error) {
	args := m.Called(ctx, actorID, roles, targetUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UserResponse), args.Error(1)
}

func (m *MockAdminService) UpdateUser(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.UpdateUserRequest, ip, ua string) (*dto.UserResponse, error) {
	args := m.Called(ctx, actorID, roles, targetUserID, req, ip, ua)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UserResponse), args.Error(1)
}

func (m *MockAdminService) SuspendUser(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.SuspendUserRequest, ip, ua string) (*dto.UserResponse, error) {
	args := m.Called(ctx, actorID, roles, targetUserID, req, ip, ua)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UserResponse), args.Error(1)
}

func (m *MockAdminService) AssignRole(ctx context.Context, actorID uuid.UUID, roles []string, targetUserID uuid.UUID, req dto.AssignRoleRequest, ip, ua string) (*dto.AssignRoleResponse, error) {
	args := m.Called(ctx, actorID, roles, targetUserID, req, ip, ua)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.AssignRoleResponse), args.Error(1)
}

func (m *MockAdminService) GetAdminStats(ctx context.Context, actorID uuid.UUID, roles []string) (*dto.AdminStatsResponse, error) {
	args := m.Called(ctx, actorID, roles)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.AdminStatsResponse), args.Error(1)
}

var _ service.AdminService = (*MockAdminService)(nil)

func newTestHandler(svc service.AdminService) (*AdminHandler, chi.Router) {
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewAdminHandler(svc, cfg, nil, log)

	r := chi.NewRouter()
	r.Get("/admin/stats", h.GetStats)
	r.Get("/admin/users", h.ListUsers)
	r.Get("/admin/users/{id}", h.GetUser)
	r.Put("/admin/users/{id}", h.UpdateUser)
	r.Post("/admin/users/{id}/suspend", h.SuspendUser)
	r.Post("/admin/users/{id}/roles", h.AssignRole)
	r.Get("/admin/audit-logs", h.ListAuditLogs)

	return h, r
}

func withAuth(req *http.Request, userID uuid.UUID, roles []string) *http.Request {
	ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
	ctx = context.WithValue(ctx, middleware.RolesContextKey, roles)
	return req.WithContext(ctx)
}

func TestAdminHandler_ListAuditLogs_Success(t *testing.T) {
	mockSvc := new(MockAdminService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()
	filter := dto.ListAuditLogsFilter{
		Page:  1,
		Limit: 10,
	}

	expectedLogs := []*dto.AuditLogResponse{
		{
			ID:         uuid.New().String(),
			ActorID:    userID.String(),
			Action:     "medical_record.viewed",
			TargetType: "medical_records",
			TargetID:   uuid.New().String(),
			IPAddress:  "127.0.0.1",
			CreatedAt:  "2026-07-07T00:00:00Z",
		},
	}

	mockSvc.On("ListAuditLogs", mock.Anything, userID, []string{"admin"}, filter).Return(expectedLogs, 1, nil).Once()

	req, _ := http.NewRequest(http.MethodGet, "/admin/audit-logs?page=1&limit=10", nil)
	req = withAuth(req, userID, []string{"admin"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var envelope struct {
		Success    bool                   `json:"success"`
		Data       []dto.AuditLogResponse `json:"data"`
		Pagination struct {
			Page       int `json:"page"`
			Limit      int `json:"limit"`
			TotalItems int `json:"total_items"`
			TotalPages int `json:"total_pages"`
		} `json:"pagination"`
	}

	require.NoError(t, json.NewDecoder(rec.Body).Decode(&envelope))
	assert.True(t, envelope.Success)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, 1, envelope.Pagination.TotalItems)
	mockSvc.AssertExpectations(t)
}

func TestAdminHandler_GetStats_Success(t *testing.T) {
	mockSvc := new(MockAdminService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()
	expectedStats := &dto.AdminStatsResponse{
		TotalUsers:         10,
		TotalPatients:      6,
		TotalDoctors:       3,
		VerifiedDoctors:    2,
		PendingDoctors:     1,
		TotalConsultations: 5,
		TotalOrders:        4,
		TotalAuditLogs:     20,
	}

	mockSvc.On("GetAdminStats", mock.Anything, userID, []string{"admin"}).Return(expectedStats, nil).Once()

	req, _ := http.NewRequest(http.MethodGet, "/admin/stats", nil)
	req = withAuth(req, userID, []string{"admin"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var envelope struct {
		Success bool                   `json:"success"`
		Data    dto.AdminStatsResponse `json:"data"`
	}

	require.NoError(t, json.NewDecoder(rec.Body).Decode(&envelope))
	assert.True(t, envelope.Success)
	assert.Equal(t, 10, envelope.Data.TotalUsers)
	assert.Equal(t, 2, envelope.Data.VerifiedDoctors)
	mockSvc.AssertExpectations(t)
}

func TestAdminHandler_ListUsers_Success(t *testing.T) {
	mockSvc := new(MockAdminService)
	_, r := newTestHandler(mockSvc)

	userID := uuid.New()
	filter := dto.ListUsersFilter{
		Page:  1,
		Limit: 10,
	}

	expectedUsers := []*dto.UserResponse{
		{
			ID:         uuid.New().String(),
			Email:      "timur@telemedhub.com",
			FullName:   "Timur",
			Status:     "active",
			IsVerified: true,
			Roles:      []string{"patient"},
			CreatedAt:  "2026-07-07T00:00:00Z",
		},
	}

	mockSvc.On("ListUsers", mock.Anything, userID, []string{"admin"}, filter).Return(expectedUsers, 1, nil).Once()

	req, _ := http.NewRequest(http.MethodGet, "/admin/users?page=1&limit=10", nil)
	req = withAuth(req, userID, []string{"admin"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var envelope struct {
		Success bool               `json:"success"`
		Data    []dto.UserResponse `json:"data"`
	}

	require.NoError(t, json.NewDecoder(rec.Body).Decode(&envelope))
	assert.True(t, envelope.Success)
	assert.Len(t, envelope.Data, 1)
	mockSvc.AssertExpectations(t)
}

func TestAdminHandler_SuspendUser_Success(t *testing.T) {
	mockSvc := new(MockAdminService)
	_, r := newTestHandler(mockSvc)

	adminID := uuid.New()
	targetID := uuid.New()
	reqBody := dto.SuspendUserRequest{
		Status: "suspended",
		Reason: "Violation of terms",
	}

	expectedResp := &dto.UserResponse{
		ID:       targetID.String(),
		Email:    "baduser@example.com",
		FullName: "Bad User",
		Status:   "suspended",
	}

	mockSvc.On("SuspendUser", mock.Anything, adminID, []string{"admin"}, targetID, reqBody, mock.Anything, mock.Anything).
		Return(expectedResp, nil).Once()

	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, "/admin/users/"+targetID.String()+"/suspend", bytes.NewReader(bodyBytes))
	req = withAuth(req, adminID, []string{"admin"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockSvc.AssertExpectations(t)
}

func TestAdminHandler_UpdateUser_Success(t *testing.T) {
	mockSvc := new(MockAdminService)
	_, r := newTestHandler(mockSvc)

	adminID := uuid.New()
	targetID := uuid.New()
	reqBody := dto.UpdateUserRequest{
		Email:    "updated@example.com",
		FullName: "Updated Name",
	}

	expectedResp := &dto.UserResponse{
		ID:       targetID.String(),
		Email:    "updated@example.com",
		FullName: "Updated Name",
		Status:   "active",
	}

	mockSvc.On("UpdateUser", mock.Anything, adminID, []string{"admin"}, targetID, reqBody, mock.Anything, mock.Anything).
		Return(expectedResp, nil).Once()

	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPut, "/admin/users/"+targetID.String(), bytes.NewReader(bodyBytes))
	req = withAuth(req, adminID, []string{"admin"})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockSvc.AssertExpectations(t)
}
