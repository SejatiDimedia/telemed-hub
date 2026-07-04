# =============================================================================
# TeleMedHub — Makefile
# =============================================================================

.PHONY: run build test lint vet docker-up docker-down docker-build \
        migrate-up migrate-down migrate-create tidy clean help

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

run: ## Run the API server locally (requires infra running)
	go run ./cmd/api

build: ## Build the API binary
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/api ./cmd/api

tidy: ## Tidy go modules
	go mod tidy

clean: ## Remove build artifacts
	rm -rf bin/

# ---------------------------------------------------------------------------
# Testing & Linting
# ---------------------------------------------------------------------------

test: ## Run all tests with race detector
	go test -race -v ./...

lint: ## Run golangci-lint
	golangci-lint run ./...

vet: ## Run go vet
	go vet ./...

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------

docker-up: ## Start all services via Docker Compose
	docker-compose -f deployments/docker-compose.yml up --build -d

docker-down: ## Stop all services
	docker-compose -f deployments/docker-compose.yml down

docker-build: ## Build Docker image only
	docker build -t telemedhub-api -f deployments/Dockerfile .

docker-logs: ## Tail logs from all services
	docker-compose -f deployments/docker-compose.yml logs -f

# ---------------------------------------------------------------------------
# Database Migrations
# ---------------------------------------------------------------------------

migrate-up: ## Apply all pending migrations
	./scripts/migrate.sh up

migrate-down: ## Roll back the last migration
	./scripts/migrate.sh down

migrate-create: ## Create a new migration (usage: make migrate-create name=create_users)
	./scripts/migrate.sh create $(name)
