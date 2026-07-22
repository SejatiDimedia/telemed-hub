package file

import (
	"log/slog"

	"github.com/minio/minio-go/v7"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/file/service"
)

type Module struct {
	Service service.FileService
}

func NewModule(client *minio.Client, cfg config.MinIOConfig, logger *slog.Logger) *Module {
	svc := service.NewMinIOFileService(client, cfg, logger)
	return &Module{
		Service: svc,
	}
}
