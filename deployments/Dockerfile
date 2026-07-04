# =============================================================================
# Stage 1: Build
# =============================================================================
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api ./cmd/api

# =============================================================================
# Stage 2: Runtime (distroless for minimal attack surface)
# =============================================================================
FROM gcr.io/distroless/static-debian12

COPY --from=builder /api /api
COPY --from=builder /app/migrations /migrations

USER nonroot

EXPOSE 8080

CMD ["/api"]
