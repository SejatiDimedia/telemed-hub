package healthcheck

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"

	"github.com/timurdianradhasejati/telemed_hub/pkg/httpresponse"
)

// Handler provides HTTP handlers for health check endpoints.
type Handler struct {
	db     *pgxpool.Pool
	rdb    *redis.Client
	minio  *minio.Client
	logger *slog.Logger
}

// NewHandler creates a new health check handler.
func NewHandler(db *pgxpool.Pool, rdb *redis.Client, minioClient *minio.Client, logger *slog.Logger) *Handler {
	return &Handler{
		db:     db,
		rdb:    rdb,
		minio:  minioClient,
		logger: logger,
	}
}

// Healthz is a liveness probe — returns 200 if the process is running.
// GET /healthz
func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	httpresponse.Success(w, map[string]string{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Readyz is a readiness probe — returns 200 only if all dependencies are reachable.
// GET /readyz
func (h *Handler) Readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	checks := map[string]string{}
	allOK := true

	// PostgreSQL
	if err := h.db.Ping(ctx); err != nil {
		h.logger.Error("readyz: postgres ping failed", "error", err)
		checks["postgres"] = "error: " + err.Error()
		allOK = false
	} else {
		checks["postgres"] = "ok"
	}

	// Redis
	if err := h.rdb.Ping(ctx).Err(); err != nil {
		h.logger.Error("readyz: redis ping failed", "error", err)
		checks["redis"] = "error: " + err.Error()
		allOK = false
	} else {
		checks["redis"] = "ok"
	}

	// MinIO — check by listing buckets (lightweight)
	if _, err := h.minio.ListBuckets(ctx); err != nil {
		h.logger.Error("readyz: minio ping failed", "error", err)
		checks["minio"] = "error: " + err.Error()
		allOK = false
	} else {
		checks["minio"] = "ok"
	}

	status := "ok"
	httpStatus := http.StatusOK
	if !allOK {
		status = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	httpresponse.JSON(w, httpStatus, httpresponse.Response{
		Success: allOK,
		Data: map[string]any{
			"status": status,
			"checks": checks,
		},
	})
}
