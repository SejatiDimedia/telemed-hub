package ai

import (
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/handler"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/repository"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/service"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	patientSvc "github.com/timurdianradhasejati/telemed_hub/internal/patient/service"
)

type Module struct {
	Handler *handler.AIHandler
	Service AIService
}

func NewModule(
	db *pgxpool.Pool,
	rdb *redis.Client,
	cfg *config.Config,
	log *slog.Logger,
	patientSvc patientSvc.PatientService,
) *Module {
	repo := repository.NewPostgresRepository(db)
	llmClient := service.NewGeminiLLMClient(cfg, log)
	svc := service.NewAIService(repo, llmClient, patientSvc, log)
	h := handler.NewAIHandler(svc, cfg, rdb)

	return &Module{
		Handler: h,
		Service: svc,
	}
}
