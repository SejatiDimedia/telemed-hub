package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/validator"
	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type InventoryHandler struct {
	svc    service.InventoryService
	cfg    *config.Config
	rdb    *redis.Client
	logger *slog.Logger
}

func NewInventoryHandler(
	svc service.InventoryService,
	cfg *config.Config,
	rdb *redis.Client,
	logger *slog.Logger,
) *InventoryHandler {
	return &InventoryHandler{
		svc:    svc,
		cfg:    cfg,
		rdb:    rdb,
		logger: logger,
	}
}

func (h *InventoryHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(h.cfg, h.rdb))

		r.Get("/", h.List)
		r.Get("/{id}", h.GetByID)
		r.Post("/", h.Create)
		r.Put("/{id}", h.Update)
		r.Delete("/{id}", h.Delete)
	})

	return r
}

func (h *InventoryHandler) checkMutateAuth(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return uuid.Nil, false
	}

	roles, err := middleware.GetUserRoles(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return uuid.Nil, false
	}

	authorized := false
	for _, role := range roles {
		if role == "admin" || role == "pharmacy_staff" {
			authorized = true
			break
		}
	}

	if !authorized {
		httpcallForbidden(w)
		return uuid.Nil, false
	}

	return userID, true
}

func (h *InventoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.checkMutateAuth(w, r)
	if !ok {
		return
	}

	var req dto.CreateMedicineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "malformed JSON request body")
		return
	}

	if err := validator.ValidateCreateMedicine(req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	resp, err := h.svc.Create(r.Context(), actorID, req)
	if err != nil {
		h.logger.Error("failed to create medicine", "error", err)
		httpcallInternalError(w)
		return
	}

	httpresponse.Created(w, resp)
}

func (h *InventoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.checkMutateAuth(w, r)
	if !ok {
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_MEDICINE_ID", "invalid medicine UUID format")
		return
	}

	var req dto.UpdateMedicineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpcallBadRequest(w, "malformed JSON request body")
		return
	}

	if err := validator.ValidateUpdateMedicine(req); err != nil {
		httpcallBadRequest(w, err.Error())
		return
	}

	resp, err := h.svc.Update(r.Context(), actorID, id, req)
	if err != nil {
		if errors.Is(err, service.ErrMedicineNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "MEDICINE_NOT_FOUND", "medicine not found")
			return
		}
		h.logger.Error("failed to update medicine", "error", err)
		httpcallInternalError(w)
		return
	}

	httpcallSuccess(w, resp)
}

func (h *InventoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	_, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "INVALID_MEDICINE_ID", "invalid medicine UUID format")
		return
	}

	resp, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrMedicineNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "MEDICINE_NOT_FOUND", "medicine not found")
			return
		}
		h.logger.Error("failed to get medicine by id", "error", err)
		httpcallInternalError(w)
		return
	}

	httpcallSuccess(w, resp)
}

func (h *InventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	_, err := middleware.GetUserID(r.Context())
	if err != nil {
		httpcallUnauthorized(w)
		return
	}

	q := r.URL.Query()

	var nameFilter *string
	if name := q.Get("name"); name != "" {
		nameFilter = &name
	}

	var reqPrescFilter *bool
	if rpStr := q.Get("requires_prescription"); rpStr != "" {
		if rp, err := strconv.ParseBool(rpStr); err == nil {
			reqPrescFilter = &rp
		}
	}

	page := 1
	if pStr := q.Get("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if lStr := q.Get("page_size"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	medicines, totalItems, err := h.svc.List(r.Context(), nameFilter, reqPrescFilter, page, limit)
	if err != nil {
		h.logger.Error("failed to list medicines", "error", err)
		httpcallInternalError(w)
		return
	}

	totalPages := (totalItems + limit - 1) / limit

	httpresponse.JSON(w, http.StatusOK, httpcallEnvelope(medicines, page, limit, totalItems, totalPages))
}

func (h *InventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.checkMutateAuth(w, r)
	if !ok {
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpcallBadRequest(w, "invalid medicine UUID format")
		return
	}

	err = h.svc.Delete(r.Context(), actorID, id)
	if err != nil {
		if errors.Is(err, service.ErrMedicineNotFound) {
			httpresponse.Error(w, http.StatusNotFound, "MEDICINE_NOT_FOUND", "medicine not found")
			return
		}
		h.logger.Error("failed to delete medicine", "error", err)
		httpcallInternalError(w)
		return
	}

	httpresponse.SuccessWithMessage(w, "Medicine deleted successfully", nil)
}

func httpcallUnauthorized(w http.ResponseWriter) {
	httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized access")
}

func httpcallForbidden(w http.ResponseWriter) {
	httpresponse.Error(w, http.StatusForbidden, "FORBIDDEN", "unauthorized access to catalog management")
}

func httpcallBadRequest(w http.ResponseWriter, msg string) {
	httpcallError(w, http.StatusBadRequest, "BAD_REQUEST", msg)
}

func httpcallInternalError(w http.ResponseWriter) {
	httpresponse.InternalError(w)
}

func httpcallSuccess(w http.ResponseWriter, data any) {
	httpresponse.Success(w, data)
}

func httpcallError(w http.ResponseWriter, status int, code, msg string) {
	httpresponse.Error(w, status, code, msg)
}

func httpcallEnvelope(data any, page, limit, totalItems, totalPages int) httpresponse.Response {
	return httpcallResponseEnvelope(data, page, limit, totalItems, totalPages)
}

func httpcallResponseEnvelope(data any, page, limit, totalItems, totalPages int) httpresponse.Response {
	return httpcallResponseWrapper(data, page, limit, totalItems, totalPages)
}

func httpcallResponseWrapper(data any, page, limit, totalItems, totalPages int) httpresponse.Response {
	return httpresponse.Response{
		Success: true,
		Data:    data,
		Pagination: &httpresponse.PaginationInfo{
			Page:       page,
			Limit:      limit,
			TotalItems: totalItems,
			TotalPages: totalPages,
		},
	}
}
