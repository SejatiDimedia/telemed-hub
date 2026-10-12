package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/repository"
	"github.com/timurdianradhasejati/telemed_hub/internal/admin/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type AdminHandler struct {
	svc    service.AdminService
	cfg    *config.Config
	rdb    *redis.Client
	logger *slog.Logger
}

func NewAdminHandler(
	svc service.AdminService,
	cfg *config.Config,
	rdb *redis.Client,
	logger *slog.Logger,
) *AdminHandler {
	return &AdminHandler{
		svc:    svc,
		cfg:    cfg,
		rdb:    rdb,
		logger: logger,
	}
}

func (h *AdminHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(h.cfg, h.rdb))

		r.Get("/stats", h.GetStats)
		r.Get("/users", h.ListUsers)
		r.Get("/users/{id}", h.GetUser)
		r.Post("/users/{id}/suspend", h.SuspendUser)
		r.Post("/users/{id}/roles", h.AssignRole)
		r.Get("/audit-logs", h.ListAuditLogs)
	})

	return r
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	stats, err := h.svc.GetAdminStats(r.Context(), userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		h.logger.Error("failed to get admin stats", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.Success(w, stats)
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	q := r.URL.Query()
	role := q.Get("role")
	status := q.Get("status")
	search := q.Get("search")

	page := 1
	if pStr := q.Get("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if lStr := q.Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	filter := dto.ListUsersFilter{
		Page:  page,
		Limit: limit,
	}
	if role != "" {
		filter.Role = &role
	}
	if status != "" {
		filter.Status = &status
	}
	if search != "" {
		filter.Search = &search
	}

	users, total, err := h.svc.ListUsers(r.Context(), userID, roles, filter)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		h.logger.Error("failed to list users", "error", err)
		httpresponse.InternalError(w)
		return
	}

	totalPages := (total + limit - 1) / limit
	httpresponse.JSON(w, http.StatusOK, httpresponse.Response{
		Success: true,
		Data:    users,
		Pagination: &httpresponse.PaginationInfo{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	})
}

func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	targetIDParam := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDParam)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid user ID format")
		return
	}

	user, err := h.svc.GetUserByID(r.Context(), userID, roles, targetID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		if errors.Is(err, repository.ErrUserNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			return
		}
		h.logger.Error("failed to get user", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.Success(w, user)
}

func (h *AdminHandler) SuspendUser(w http.ResponseWriter, r *http.Request) {
	adminUserID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	targetIDParam := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDParam)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid user ID format")
		return
	}

	var req dto.SuspendUserRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Status == "" {
		req.Status = "suspended"
	}

	ip := getIP(r)
	ua := r.Header.Get("User-Agent")

	updatedUser, err := h.svc.SuspendUser(r.Context(), adminUserID, roles, targetID, req, ip, ua)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		if errors.Is(err, service.ErrSelfModification) {
			httpresponse.Error(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		if errors.Is(err, repository.ErrUserNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			return
		}
		h.logger.Error("failed to suspend user", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.Success(w, updatedUser)
}

func (h *AdminHandler) AssignRole(w http.ResponseWriter, r *http.Request) {
	adminUserID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	targetIDParam := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDParam)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid user ID format")
		return
	}

	var req dto.AssignRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid JSON request body")
		return
	}
	if req.Role == "" {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "role is required")
		return
	}

	ip := getIP(r)
	ua := r.Header.Get("User-Agent")

	resp, err := h.svc.AssignRole(r.Context(), adminUserID, roles, targetID, req, ip, ua)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		if errors.Is(err, service.ErrInvalidRole) {
			httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if errors.Is(err, repository.ErrRoleNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "role not found in database")
			return
		}
		h.logger.Error("failed to assign role", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.Success(w, resp)
}

func (h *AdminHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	actorID := r.URL.Query().Get("actor_id")
	action := r.URL.Query().Get("action")
	targetType := r.URL.Query().Get("target_type")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
	}
	var actionPtr *string
	if action != "" {
		actionPtr = &action
	}
	var targetTypePtr *string
	if targetType != "" {
		targetTypePtr = &targetType
	}
	var fromPtr *string
	if from != "" {
		fromPtr = &from
	}
	var toPtr *string
	if to != "" {
		toPtr = &to
	}

	filter := dto.ListAuditLogsFilter{
		ActorID:    actorIDPtr,
		Action:     actionPtr,
		TargetType: targetTypePtr,
		From:       fromPtr,
		To:         toPtr,
		Page:       page,
		Limit:      limit,
	}

	logs, total, err := h.svc.ListAuditLogs(r.Context(), userID, roles, filter)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		h.logger.Error("failed to list audit logs", "error", err)
		httpresponse.InternalError(w)
		return
	}

	totalPages := (total + limit - 1) / limit

	httpresponse.JSON(w, http.StatusOK, httpresponse.Response{
		Success: true,
		Data:    logs,
		Pagination: &httpresponse.PaginationInfo{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	})
}

func getIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	if parts := strings.Split(ip, ","); len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return ip
}
