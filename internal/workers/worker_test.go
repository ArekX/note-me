package workers

import (
	"context"
	"errors"
	"io"
	"sync/atomic"
	"testing"
	"time"

	"noteme/internal/logger"
)

type fakeWorker struct {
	name string
	runs atomic.Int32
	fail int32
}

func (f *fakeWorker) Name() string { return f.name }
func (f *fakeWorker) Run(ctx context.Context) error {
	if f.runs.Add(1) <= f.fail {
		return errors.New("boom")
	}
	<-ctx.Done()
	return nil
}

func run(t *testing.T, wait time.Duration, workers ...Worker) {
	t.Helper()
	s := NewSupervisor(logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), workers...)
	ctx, cancel := context.WithCancel(context.Background())
	s.Start(ctx)
	time.Sleep(wait)
	cancel()
	s.Wait()
}

func TestWorkerIsRestarted(t *testing.T) {
	flaky := &fakeWorker{name: "flaky", fail: 1}
	run(t, 700*time.Millisecond, flaky)

	if flaky.runs.Load() < 2 {
		t.Errorf("expected a restart, runs = %d", flaky.runs.Load())
	}
}
