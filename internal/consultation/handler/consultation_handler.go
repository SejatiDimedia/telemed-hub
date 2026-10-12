package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/hub"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/service"
	doctorDTO "github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
	doctorRepo "github.com/timurdianradhasejati/telemed_hub/internal/doctor/repository"
	doctorValidator "github.com/timurdianradhasejati/telemed_hub/internal/doctor/validator"
	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type ConsultationHandler struct {
	svc    service.ConsultationService
	cfg    *config.Config
	rdb    *redis.Client
	logger *slog.Logger
	hub    *hub.Hub
}

func NewConsultationHandler(svc service.ConsultationService, cfg *config.Config, rdb *redis.Client, logger *slog.Logger) *ConsultationHandler {
	return &ConsultationHandler{
		svc:    svc,
		cfg:    cfg,
		rdb:    rdb,
		logger: logger,
		hub:    hub.NewHub(svc, logger),
	}
}

// Routes returns the router for the consultation module
func (h *ConsultationHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(h.cfg, h.rdb))

		r.Get("/{id}", h.GetByID)
		r.Get("/{id}/room", h.GetRoom)
		r.Get("/{id}/messages", h.ListMessages)
		r.Post("/{id}/messages", h.SendMessage)
		r.Get("/{id}/ws", h.ServeWS)
		r.Post("/{id}/start", h.Start)
		r.Post("/{id}/complete", h.Complete)
		r.Put("/{id}/notes", h.UpdateNotes)
		r.Post("/{id}/review", h.CreateReview)
		r.Get("/{id}/review", h.GetReview)
	})

	return r
}

func (h *ConsultationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
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
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	resp, err := h.svc.GetByID(r.Context(), id, userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation")
			return
		}
		httpresponse.Error(w, http.StatusNotFound, "CONSULTATION_NOT_FOUND", "consultation session not found")
		return
	}

	httpresponse.Success(w, resp)
}

func (h *ConsultationHandler) Start(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	// Only doctor can start consultation
	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}
	isDoctor := false
	for _, role := range roles {
		if role == "doctor" {
			isDoctor = true
			break
		}
	}
	if !isDoctor {
		httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "only doctor can start consultation")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	resp, err := h.svc.Start(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized doctor access")
			return
		}
		if errors.Is(err, service.ErrInvalidTransition) {
			httpresponse.Error(w, http.StatusUnprocessableEntity, "INVALID_STATE", err.Error())
			return
		}
		h.logger.Error("failed to start consultation", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.SuccessWithMessage(w, "consultation started successfully", resp)
}

func (h *ConsultationHandler) Complete(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	resp, err := h.svc.Complete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized doctor access")
			return
		}
		if errors.Is(err, service.ErrInvalidTransition) {
			httpresponse.Error(w, http.StatusUnprocessableEntity, "INVALID_STATE", err.Error())
			return
		}
		h.logger.Error("failed to complete consultation", "error", err)
		httpresponse.InternalError(w)
		return
	}

	if h.hub != nil {
		canonicalID, parseErr := uuid.Parse(resp.ID)
		if parseErr == nil {
			h.hub.BroadcastSessionEnded(canonicalID)
		} else {
			h.hub.BroadcastSessionEnded(id)
		}
	}

	httpcallSuccess(w, resp)
}

func (h *ConsultationHandler) UpdateNotes(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	var req dto.UpdateNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "malformed request JSON")
		return
	}

	resp, err := h.svc.UpdateNotes(r.Context(), id, userID, req.Notes)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized doctor access")
			return
		}
		if errors.Is(err, service.ErrInvalidTransition) {
			httpresponse.Error(w, http.StatusUnprocessableEntity, "INVALID_STATE", err.Error())
			return
		}
		h.logger.Error("failed to update notes", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpcallSuccess(w, resp)
}

func (h *ConsultationHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
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
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	room, err := h.svc.GetRoom(r.Context(), id, userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation room")
			return
		}
		httpresponse.Error(w, http.StatusNotFound, "ROOM_NOT_FOUND", "consultation room not found")
		return
	}

	httpresponse.Success(w, room)
}

func (h *ConsultationHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
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
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	messages, err := h.svc.ListMessages(r.Context(), id, userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation messages")
			return
		}
		httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "consultation not found")
		return
	}

	httpresponse.Success(w, messages)
}

func (h *ConsultationHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	var req dto.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", "malformed request payload")
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		httpresponse.Error(w, http.StatusBadRequest, "EMPTY_MESSAGE", "message cannot be empty")
		return
	}

	msg, err := h.svc.SendMessage(r.Context(), id, userID, req)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized to send message to this consultation")
			return
		}
		httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "consultation not found")
		return
	}

	// Broadcast to WebSocket hub so all connected peers receive real-time chat
	if h.hub != nil {
		canonicalID, parseErr := uuid.Parse(msg.ConsultationID)
		if parseErr == nil {
			h.hub.BroadcastChat(canonicalID, msg)
		}
	}

	httpresponse.JSON(w, http.StatusCreated, httpresponse.Response{
		Success: true,
		Data:    msg,
	})
}

func (h *ConsultationHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
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
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	// Verify caller belongs to this room
	room, err := h.svc.GetRoom(r.Context(), id, userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation room")
			return
		}
		httpresponse.Error(w, http.StatusNotFound, "ROOM_NOT_FOUND", "consultation room not found")
		return
	}

	userName := room.Patient.Name
	userRole := "patient"
	if userID.String() == room.Doctor.UserID {
		userName = room.Doctor.Name
		userRole = "doctor"
	}

	// Always use canonical consultation ID so both doctor and patient enter the exact same room
	canonicalID, parseErr := uuid.Parse(room.ConsultationID)
	if parseErr != nil {
		canonicalID = id
	}

	h.hub.ServeWS(w, r, canonicalID, userID, userName, userRole)
}

func httpcallUnauthorized(w http.ResponseWriter) {
	httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthenticated")
}

func httpcallSuccess(w http.ResponseWriter, data any) {
	httpresponse.Success(w, data)
}

// CreateReview handler.
// POST /consultations/{id}/review
func (h *ConsultationHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
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

	isPatient := false
	for _, role := range roles {
		if role == "patient" {
			isPatient = true
			break
		}
	}
	if !isPatient {
		httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "only patients can submit a consultation review")
		return
	}

	idStr := chi.URLParam(r, "id")
	consultationID, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	var req doctorDTO.CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "malformed request JSON")
		return
	}

	review, err := h.svc.CreateReview(r.Context(), consultationID, userID, req)
	if err != nil {
		var valErrs doctorValidator.ValidationErrors
		if errors.As(err, &valErrs) {
			details := doctorValidator.ExtractValidationDetails(err)
			httpresponse.JSON(w, http.StatusBadRequest, httpresponse.Response{
				Success:   false,
				Error:     "Validation failed",
				ErrorCode: "VALIDATION_ERROR",
				Data:      details,
			})
			return
		}
		if errors.Is(err, service.ErrConsultationNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "consultation not found")
			return
		}
		if errors.Is(err, service.ErrConsultationNotCompleted) {
			httpresponse.Error(w, http.StatusUnprocessableEntity, "CONSULTATION_NOT_COMPLETED", "consultation must be completed before submitting a review")
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation")
			return
		}
		if errors.Is(err, service.ErrAlreadyReviewed) || errors.Is(err, doctorRepo.ErrReviewAlreadyExists) {
			httpresponse.Error(w, http.StatusConflict, "ALREADY_REVIEWED", "a review has already been submitted for this consultation")
			return
		}
		h.logger.Error("failed to create consultation review", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.JSON(w, http.StatusCreated, httpresponse.Response{
		Success: true,
		Data:    review,
	})
}

// GetReview handler.
// GET /consultations/{id}/review
func (h *ConsultationHandler) GetReview(w http.ResponseWriter, r *http.Request) {
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
	consultationID, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_CONSULTATION_ID", "invalid consultation UUID format")
		return
	}

	review, err := h.svc.GetReview(r.Context(), consultationID, userID, roles)
	if err != nil {
		if errors.Is(err, service.ErrConsultationNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "NOT_FOUND", "consultation not found")
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to consultation")
			return
		}
		if errors.Is(err, doctorRepo.ErrReviewNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "REVIEW_NOT_FOUND", "no review found for this consultation")
			return
		}
		h.logger.Error("failed to fetch consultation review", "error", err)
		httpresponse.InternalError(w)
		return
	}

	httpcallSuccess(w, review)
}

