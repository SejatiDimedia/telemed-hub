package handler

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/auth/repository"
	fileservice "github.com/timurdianradhasejati/telemed_hub/internal/file/service"
	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type UserHandler struct {
	authRepo repository.AuthRepository
	fileSvc  fileservice.FileService
	cfg      *config.Config
	rdb      *redis.Client
	logger   *slog.Logger
}

func NewUserHandler(authRepo repository.AuthRepository, fileSvc fileservice.FileService, cfg *config.Config, rdb *redis.Client, logger *slog.Logger) *UserHandler {
	return &UserHandler{
		authRepo: authRepo,
		fileSvc:  fileSvc,
		cfg:      cfg,
		rdb:      rdb,
		logger:   logger,
	}
}

func (h *UserHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Use(middleware.AuthMiddleware(h.cfg, h.rdb)) // Require auth

	r.Post("/me/avatar", h.UploadAvatar)

	return r
}

func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, err := middleware.GetUserID(ctx)
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthenticated")
		return
	}

	// Limit to 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "BAD_REQUEST", "File too large or invalid format")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Avatar file is required")
		return
	}
	defer file.Close()

	// Upload to MinIO
	contentType := header.Header.Get("Content-Type")
	fileURL, err := h.fileSvc.UploadAvatar(ctx, file, header.Size, contentType, userID)
	if err != nil {
		h.logger.Error("failed to upload avatar", "error", err, "user_id", userID)
		httpresponse.InternalError(w)
		return
	}

	// Update DB
	err = h.authRepo.UpdateProfilePictureURL(ctx, userID, fileURL)
	if err != nil {
		h.logger.Error("failed to update profile picture in db", "error", err, "user_id", userID)
		httpresponse.InternalError(w)
		return
	}

	httpresponse.SuccessWithMessage(w, "Avatar uploaded successfully", map[string]string{
		"profile_picture_url": fileURL,
	})
}
