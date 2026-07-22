package service

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
)

type minioService struct {
	client     *minio.Client
	bucketName string
	logger     *slog.Logger
	endpoint   string
	useSSL     bool
}

// NewMinIOFileService creates a new FileService backed by MinIO.
func NewMinIOFileService(client *minio.Client, cfg config.MinIOConfig, logger *slog.Logger) FileService {
	svc := &minioService{
		client:     client,
		bucketName: cfg.BucketName,
		logger:     logger.With("module", "file_service"),
		endpoint:   cfg.Endpoint,
		useSSL:     cfg.UseSSL,
	}

	svc.ensureBucketExists(context.Background())
	return svc
}

func (s *minioService) ensureBucketExists(ctx context.Context) {
	exists, err := s.client.BucketExists(ctx, s.bucketName)
	if err != nil {
		s.logger.Error("Failed to check if bucket exists", "error", err)
		return
	}

	if !exists {
		s.logger.Info("Bucket does not exist, creating...", "bucket", s.bucketName)
		err = s.client.MakeBucket(ctx, s.bucketName, minio.MakeBucketOptions{})
		if err != nil {
			s.logger.Error("Failed to create bucket", "error", err)
			return
		}
	}

	// Always ensure bucket policy is set to public read
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}
		]
	}`, s.bucketName)

	err = s.client.SetBucketPolicy(ctx, s.bucketName, policy)
	if err != nil {
		s.logger.Error("Failed to set public bucket policy", "error", err)
	} else {
		s.logger.Info("Bucket policy set to public read")
	}
}

func (s *minioService) UploadAvatar(ctx context.Context, file io.Reader, size int64, contentType string, userID uuid.UUID) (string, error) {
	// e.g. avatars/00000000-0000-0000-0000-000000000000-1634567890.jpg
	ext := ""
	if contentType == "image/jpeg" {
		ext = ".jpg"
	} else if contentType == "image/png" {
		ext = ".png"
	} else if contentType == "image/webp" {
		ext = ".webp"
	} else {
		return "", fmt.Errorf("unsupported content type: %s", contentType)
	}

	objectName := fmt.Sprintf("avatars/%s-%d%s", userID.String(), time.Now().Unix(), ext)

	_, err := s.client.PutObject(ctx, s.bucketName, objectName, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		s.logger.Error("Failed to upload avatar to MinIO", "error", err)
		return "", err
	}

	// Generate the public URL
	protocol := "http"
	if s.useSSL {
		protocol = "https"
	}
	// Note: For local development, this URL might need to be accessed via localhost instead of the container name
	// But returning the relative or standard public path is usually sufficient if we proxy or expose MinIO directly.
	// Actually, returning just the bucket/objectName or the absolute localhost URL for dev is tricky.
	// Since the client accesses MinIO via localhost:9000, we'll format it assuming public endpoint is localhost:9000
	// For production, the MINIO_ENDPOINT would be the public domain.
	
	// A simple approach is just protocol://endpoint/bucket/objectName
	// BUT, if endpoint is 'minio:9000' (internal docker network), it won't work on the client browser.
	// So we should construct a URL that works.
	// In our docker-compose, minio is mapped to localhost:9000.
	
	publicURL := fmt.Sprintf("%s://%s/%s/%s", protocol, "localhost:9000", s.bucketName, objectName)
	return publicURL, nil
}
