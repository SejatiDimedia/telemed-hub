package inventory

import (
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/handler"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/repository"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/service"
)

type Module struct {
	Handler *handler.InventoryHandler
	Service service.InventoryService
}

func NewModule(
	db *pgxpool.Pool,
	rdb *redis.Client,
	cfg *config.Config,
	log *slog.Logger,
) *Module {
	repo := repository.NewPostgresRepository(db)
	svc := service.NewInventoryService(repo)
	h := handler.NewInventoryHandler(svc, cfg, rdb, log)

	return &Module{
		Handler: h,
		Service: svc,
	}
}
