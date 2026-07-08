package jobs

import (
	"context"
	"errors"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestScheduler_HappyPath(t *testing.T) {
	log := slog.New(slog.DiscardHandler)
	scheduler := NewScheduler(log, 2)

	var runCount int32
	scheduler.Register("test-job", 50*time.Millisecond, func(ctx context.Context) error {
		atomic.AddInt32(&runCount, 1)
		return nil
	})

	scheduler.Start()
	time.Sleep(120 * time.Millisecond)
	scheduler.Stop()

	// Should run at least twice (on start + after 50ms + after 100ms)
	assert.GreaterOrEqual(t, atomic.LoadInt32(&runCount), int32(2))
}

func TestScheduler_RetryMechanism(t *testing.T) {
	log := slog.New(slog.DiscardHandler)
	scheduler := NewScheduler(log, 2)

	var attempts int32
	scheduler.Register("failing-job", 1*time.Hour, func(ctx context.Context) error {
		atomic.AddInt32(&attempts, 1)
		return errors.New("temporary failure")
	})

	// Run once manually to avoid waiting 1 hour
	scheduler.executeWithRetry(scheduler.jobs[0])

	// Wait enough for the 3 attempts (attempt 1 -> wait 500ms -> attempt 2 -> wait 1s -> attempt 3)
	time.Sleep(1800 * time.Millisecond)

	assert.Equal(t, int32(3), atomic.LoadInt32(&attempts))
}
