package workers

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

type Worker interface {
	Name() string
	Run(ctx context.Context) error
}

type Supervisor struct {
	log     *slog.Logger
	retries int
	workers []Worker
	wg      sync.WaitGroup
}

func NewSupervisor(log *slog.Logger, workers ...Worker) *Supervisor {
	return &Supervisor{log: log, retries: 5, workers: workers}
}

func (s *Supervisor) Start(ctx context.Context) {
	for _, w := range s.workers {
		s.log.Info("Starting worker", "name", w.Name())
		s.wg.Add(1)
		go s.supervise(ctx, w)
	}
}

func (s *Supervisor) Wait() {
	s.wg.Wait()
}

func (s *Supervisor) supervise(ctx context.Context, w Worker) {
	defer s.wg.Done()

	for retriesLeft := s.retries; ; retriesLeft-- {
		err := runOnce(ctx, w)
		if err == nil || ctx.Err() != nil {
			return
		}
		if retriesLeft <= 0 {
			s.log.Error("Worker failed and will not be restarted", "name", w.Name(), "error", err)
			return
		}
		s.log.Error("Restarting worker", "name", w.Name(), "error", err, "retriesLeft", retriesLeft)

		select {
		case <-time.After(500 * time.Millisecond):
		case <-ctx.Done():
			return
		}
	}
}

func runOnce(ctx context.Context, w Worker) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("panic: %v", rec)
		}
	}()
	return w.Run(ctx)
}
