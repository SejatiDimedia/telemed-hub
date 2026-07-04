package logger

import (
	"log/slog"
	"os"
	"strings"
)

// Setup initialises and returns a structured JSON logger using slog.
// The level string is case-insensitive: "debug", "info", "warn", "error".
// If the level is unrecognised, defaults to Info.
func Setup(level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "info":
		lvl = slog.LevelInfo
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     lvl,
		AddSource: lvl == slog.LevelDebug,
	})

	logger := slog.New(handler)

	// Also set as the default logger so slog.Info() etc. work globally
	// as a fallback (though we prefer explicit injection).
	slog.SetDefault(logger)

	return logger
}
