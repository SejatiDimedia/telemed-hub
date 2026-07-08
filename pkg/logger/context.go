package logger

import (
	"context"
	"log/slog"
)

type contextKey string

const (
	// traceIDKey is the context key for the trace/request ID.
	traceIDKey contextKey = "trace_id"

	// loggerKey is the context key for the request-scoped logger.
	loggerKey contextKey = "logger"
)

// CtxWithTraceID stores a trace ID in the context.
func CtxWithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

// TraceIDFromCtx extracts the trace ID from the context.
// Returns an empty string if no trace ID is set.
func TraceIDFromCtx(ctx context.Context) string {
	v, _ := ctx.Value(traceIDKey).(string)
	return v
}

// CtxWithLogger stores a request-scoped logger in the context.
func CtxWithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, l)
}

// FromCtx extracts the request-scoped logger from the context.
// Falls back to slog.Default() if no logger is stored.
func FromCtx(ctx context.Context) *slog.Logger {
	l, ok := ctx.Value(loggerKey).(*slog.Logger)
	if !ok || l == nil {
		return slog.Default()
	}
	return l
}
