package jobprocessor

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"noteme/internal/components/jobs"
	"noteme/internal/logger"
)

func newTestService(handler Handler) (*Service, *jobs.Queue) {
	queue := jobs.New()
	return &Service{
		log:      logger.New(logger.Options{Level: "ERROR", Output: io.Discard}),
		queue:    queue,
		handlers: map[jobs.Name]Handler{jobs.CreateDataExport: handler},
	}, queue
}

func TestAbortCancelsRunningJob(t *testing.T) {
	started := make(chan struct{})
	result := make(chan error, 1)
	s, queue := newTestService(func(ctx context.Context, _ *jobs.Job) error {
		close(started)
		<-ctx.Done()
		result <- ctx.Err()
		return ctx.Err()
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go s.Run(ctx)

	id, err := queue.Enqueue(jobs.CreateDataExport, 1, nil)
	if err != nil {
		t.Fatal(err)
	}
	<-started
	if err := queue.Abort(id, 1); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Errorf("job context error = %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("aborted job kept running")
	}
}

func TestFinishedAndPanickingJobsAreForgotten(t *testing.T) {
	done := make(chan struct{}, 2)
	s, queue := newTestService(func(_ context.Context, job *jobs.Job) error {
		defer func() { done <- struct{}{} }()
		if job.UserID == 2 {
			panic("boom")
		}
		return nil
	})

	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})
	go func() {
		s.Run(ctx)
		close(stopped)
	}()

	first, _ := queue.Enqueue(jobs.CreateDataExport, 1, nil)
	second, _ := queue.Enqueue(jobs.CreateDataExport, 2, nil)
	<-done
	<-done
	cancel()
	<-stopped

	for id, user := range map[string]int{first: 1, second: 2} {
		if err := queue.Abort(id, user); !errors.Is(err, jobs.ErrNotOwner) {
			t.Errorf("job of user %d still registered: %v", user, err)
		}
	}
}

func TestStopCancelsRunningJobs(t *testing.T) {
	started := make(chan struct{})
	s, queue := newTestService(func(ctx context.Context, _ *jobs.Job) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	})

	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})
	go func() {
		s.Run(ctx)
		close(stopped)
	}()
	if _, err := queue.Enqueue(jobs.CreateDataExport, 1, nil); err != nil {
		t.Fatal(err)
	}
	<-started
	cancel()
	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("Run did not wait for the cancelled job")
	}
}
