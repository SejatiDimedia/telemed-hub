package service

import (
	"context"
	"io"

	"github.com/google/uuid"
)

// FileService defines the operations for handling files.
type FileService interface {
	UploadAvatar(ctx context.Context, file io.Reader, size int64, contentType string, userID uuid.UUID) (string, error)
}
