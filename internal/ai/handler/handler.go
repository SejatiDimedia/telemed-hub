package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/validator"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type AIHandler struct {
	svc service.AIService
	cfg *config.Config
	rdb *redis.Client
}

func NewAIHandler(svc service.AIService, cfg *config.Config, rdb *redis.Client) *AIHandler {
	return &AIHandler{
		svc: svc,
		cfg: cfg,
		rdb: rdb,
	}
}

func (h *AIHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.AuthMiddleware(h.cfg, h.rdb))
	r.Post("/", h.CreateSession)
	r.Post("/{id}/messages", h.PostMessage)
	r.Get("/{id}", h.GetSession)
	r.Get("/", h.ListSessions)
	return r
}

func (h *AIHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	if !h.hasRole(r, "patient") {
		httpcallForbidden(w, "only patients can initiate AI sessions")
		return
	}

	sess, err := h.svc.CreateSession(r.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrActiveSessionExists) {
			httpcallError(w, http.StatusConflict, "ACTIVE_SESSION_EXISTS", "active AI session already exists for this patient")
			return
		}
		httpcallInternalError(w, err.Error())
		return
	}

	httpresponse.JSON(w, http.StatusCreated, httpresponse.Response{
		Success: true,
		Data:    sess,
	})
}

func (h *AIHandler) PostMessage(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	if !h.hasRole(r, "patient") {
		httpcallForbidden(w, "only patients can send messages to AI sessions")
		return
	}

	idStr := chi.URLParam(r, "id")
	sessionID, err := uuid.Parse(idStr)
	if err != nil {
		httpcallBadRequest(w, "invalid session UUID format")
		return
	}

	var req dto.PostMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpcallBadRequest(w, "invalid JSON payload")
		return
	}

	if err := validator.ValidatePostMessage(req); err != nil {
		details := validator.ExtractValidationDetails(err)
		httpresponse.JSON(w, http.StatusBadRequest, httpresponse.Response{
			Success:   false,
			Error:     "Validation failed",
			ErrorCode: "VALIDATION_ERROR",
			Data:      details,
		})
		return
	}

	res, err := h.svc.PostMessage(r.Context(), userID, sessionID, req.Message)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			httpcallForbidden(w, "unauthorized to write to this session")
		case errors.Is(err, service.ErrSessionClosed):
			httpcallError(w, http.StatusConflict, "SESSION_CLOSED", "cannot post messages to a closed AI session")
		case errors.Is(err, service.ErrActiveSessionExists):
			httpcallError(w, http.StatusConflict, "ACTIVE_SESSION_EXISTS", "active AI session already exists")
		default:
			httpcallInternalError(w, err.Error())
		}
		return
	}

	httpresponse.JSON(w, http.StatusCreated, httpresponse.Response{
		Success: true,
		Data:    res,
	})
}

func (h *AIHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	idStr := chi.URLParam(r, "id")
	sessionID, err := uuid.Parse(idStr)
	if err != nil {
		httpcallBadRequest(w, "invalid session UUID format")
		return
	}

	sess, err := h.svc.GetSession(r.Context(), userID, roles, sessionID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			httpcallForbidden(w, "unauthorized to read this session")
		case errors.Is(err, service.ErrSessionClosed):
			httpcallError(w, http.StatusConflict, "SESSION_CLOSED", "session closed")
		default:
			httpcallInternalError(w, err.Error())
		}
		return
	}

	httpresponse.JSON(w, http.StatusOK, httpresponse.Response{
		Success: true,
		Data:    sess,
	})
}

func (h *AIHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	if !h.hasRole(r, "patient") {
		httpcallForbidden(w, "only patients can view their triage history")
		return
	}

	sessions, err := h.svc.ListSessions(r.Context(), userID)
	if err != nil {
		httpcallInternalError(w, err.Error())
		return
	}

	totalPages := 1
	limit := 10
	if limit > 0 {
		totalPages = (len(sessions) + limit - 1) / limit
	}
	httpresponse.JSON(w, http.StatusOK, httpresponse.Response{
		Success: true,
		Data:    sessions,
		Pagination: &httpresponse.PaginationInfo{
			Page:       1,
			Limit:      limit,
			TotalItems: len(sessions),
			TotalPages: totalPages,
		},
	})
}

func (h *AIHandler) hasRole(r *http.Request, role string) bool {
	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		return false
	}
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

func httpcallUnauthorized(w http.ResponseWriter) {
	httpcallError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
}

func httpcallForbidden(w http.ResponseWriter, msg string) {
	httpcallError(w, http.StatusForbidden, "FORBIDDEN", msg)
}

func httpcallBadRequest(w http.ResponseWriter, msg string) {
	httpcallError(w, http.StatusBadRequest, "BAD_REQUEST", msg)
}

func httpcallInternalError(w http.ResponseWriter, msg string) {
	httpcallError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", msg)
}

func httpcallError(w http.ResponseWriter, status int, code, message string) {
	httpresponse.JSON(w, status, httpresponse.Response{
		Success:   false,
		Error:     message,
		ErrorCode: code,
	})
}
