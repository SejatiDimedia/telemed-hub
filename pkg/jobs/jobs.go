package jobs

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type JobFunc func(ctx context.Context) error

type Job struct {
	Name     string
	Interval time.Duration
	Handler  JobFunc
}

type Scheduler struct {
	jobs       []Job
	log        *slog.Logger
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	maxWorkers int
	sem        chan struct{}
}

func NewScheduler(log *slog.Logger, maxWorkers int) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		log:        log,
		maxWorkers: maxWorkers,
		sem:        make(chan struct{}, maxWorkers),
		ctx:        ctx,
		cancel:     cancel,
	}
}

func (s *Scheduler) Register(name string, interval time.Duration, handler JobFunc) {
	s.jobs = append(s.jobs, Job{
		Name:     name,
		Interval: interval,
		Handler:  handler,
	})
}

func (s *Scheduler) Start() {
	s.log.Info("starting background job scheduler")
	for _, j := range s.jobs {
		s.wg.Add(1)
		go s.runJobLoop(j)
	}
}

func (s *Scheduler) Stop() {
	s.log.Info("stopping background job scheduler")
	s.cancel()
	s.wg.Wait()
	s.log.Info("background job scheduler stopped successfully")
}

func (s *Scheduler) runJobLoop(j Job) {
	defer s.wg.Done()
	ticker := time.NewTicker(j.Interval)
	defer ticker.Stop()

	s.log.Info("scheduled background job", "name", j.Name, "interval", j.Interval)

	// Run once immediately on start
	s.executeWithRetry(j)

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.executeWithRetry(j)
		}
	}
}

func (s *Scheduler) executeWithRetry(j Job) {
	// Acquire worker slot
	select {
	case s.sem <- struct{}{}:
	case <-s.ctx.Done():
		return
	}

	go func() {
		defer func() { <-s.sem }()

		s.log.Debug("executing background job", "name", j.Name)
		maxAttempts := 3
		var err error
		for attempt := 1; attempt <= maxAttempts; attempt++ {
			err = j.Handler(s.ctx)
			if err == nil {
				s.log.Debug("background job completed successfully", "name", j.Name, "attempt", attempt)
				return
			}
			s.log.Warn("background job failed, retrying...", "name", j.Name, "attempt", attempt, "error", err)

			// Exponential backoff between retries (e.g. 500ms, 1s, 2s)
			if attempt < maxAttempts {
				select {
				case <-s.ctx.Done():
					return
				case <-time.After(time.Duration(1<<(attempt-1)) * 500 * time.Millisecond):
				}
			}
		}
		s.log.Error("background job failed permanently after max attempts", "name", j.Name, "error", err)
	}()
}
