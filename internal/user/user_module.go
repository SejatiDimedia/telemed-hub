package user

import (
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/auth/repository"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	fileservice "github.com/timurdianradhasejati/telemed_hub/internal/file/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/user/handler"
)

type Module struct {
	Handler *handler.UserHandler
}

func NewModule(db *pgxpool.Pool, rdb *redis.Client, cfg *config.Config, fileSvc fileservice.FileService, logger *slog.Logger) *Module {
	authRepo := repository.NewPostgresRepository(db)
	h := handler.NewUserHandler(authRepo, fileSvc, cfg, rdb, logger)
	return &Module{
		Handler: h,
	}
}
