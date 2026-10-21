package jobprocessor

import (
	"context"
	"log/slog"
	"sync"

	"noteme/internal/components"
	"noteme/internal/components/jobs"
)

type Handler func(ctx context.Context, job *jobs.Job) error

// Each job runs on its own goroutine, as the original ran them concurrently;
// its context ends when the job is aborted or the worker stops.
type Service struct {
	log      *slog.Logger
	queue    *jobs.Queue
	handlers map[jobs.Name]Handler
	running  sync.WaitGroup
}

func New(log *slog.Logger, c *components.Components) *Service {
	return &Service{
		log:   log,
		queue: c.Jobs,
		handlers: map[jobs.Name]Handler{
			jobs.CreateDataExport: newDataExport(c, log).run,
		},
	}
}

func (s *Service) Name() string { return "processor" }

func (s *Service) Run(ctx context.Context) error {
	defer s.running.Wait()
	for {
		select {
		case <-ctx.Done():
			return nil
		case job := <-s.queue.Pending():
			s.running.Add(1)
			go s.process(ctx, job)
		}
	}
}

func (s *Service) process(ctx context.Context, job *jobs.Job) {
	defer s.running.Done()
	defer s.queue.Finish(job.ID)
	defer func() {
		if rec := recover(); rec != nil {
			s.log.Error("Job panicked", "jobId", job.ID, "job", job.Name, "panic", rec)
		}
	}()

	handler, ok := s.handlers[job.Name]
	if !ok {
		s.log.Error("No handler for job", "jobId", job.ID, "job", job.Name)
		return
	}

	jobCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	stop := context.AfterFunc(job.Context(), cancel)
	defer stop()

	s.log.Info("Processing a job", "jobId", job.ID, "job", job.Name)
	err := handler(jobCtx, job)
	switch {
	case job.Context().Err() != nil:
		s.log.Info("Job aborted", "jobId", job.ID, "job", job.Name)
	case err != nil:
		s.log.Error("Job failed", "jobId", job.ID, "job", job.Name, "error", err)
	default:
		s.log.Info("Job processed", "jobId", job.ID, "job", job.Name)
	}
}
