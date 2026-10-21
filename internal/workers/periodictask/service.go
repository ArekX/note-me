package periodictask

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
)

const (
	restoreRetryDelay    = 2 * time.Second
	restoreRetryMaxDelay = time.Minute
)

type Task interface {
	Name() string
	NextAt(now int64) int64
	Trigger(ctx context.Context) error
}

type scheduled struct {
	nextAt int64
	task   Task
}

// Schedules live in periodic_task_schedule, so a restart keeps them and a run
// missed while the server was down fires once on the first tick.
type Service struct {
	log     *slog.Logger
	repo    repository.Repository
	bus     *eventbus.Bus
	tasks   []*scheduled
	now     func() time.Time
	history time.Duration
	mu      sync.Mutex
	// Next runs asked for by users, applied by Run between ticks.
	requested map[string]int64
	wake      chan struct{}
}

func New(log *slog.Logger, repo repository.Repository, bus *eventbus.Bus, historyDays int, tasks ...Task) *Service {
	s := &Service{
		log:       log,
		repo:      repo,
		bus:       bus,
		now:       time.Now,
		history:   time.Duration(historyDays) * 24 * time.Hour,
		requested: map[string]int64{},
		wake:      make(chan struct{}, 1),
	}
	for _, t := range tasks {
		s.tasks = append(s.tasks, &scheduled{task: t})
	}
	// The bus calls this in the publisher's goroutine, which must not wait
	// for a running task.
	bus.Subscribe(func(_ context.Context, e eventbus.PeriodicTaskRunRequested) {
		s.mu.Lock()
		s.requested[e.Task] = e.NextRunAt
		s.mu.Unlock()
		select {
		case s.wake <- struct{}{}:
		default:
		}
	})
	return s
}

func (s *Service) Name() string { return "periodic-task" }

// The database may not be reachable yet at start, so restore is retried
// rather than handed to the supervisor, whose few restarts would run out.
func (s *Service) Run(ctx context.Context) error {
	for delay := restoreRetryDelay; ; delay = min(delay*2, restoreRetryMaxDelay) {
		err := s.restore(ctx)
		if err == nil {
			break
		}
		s.log.Error("Could not restore periodic task schedules", "error", err, "retryIn", delay)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(delay):
		}
	}
	for {
		s.tick(ctx)

		select {
		case <-ctx.Done():
			return nil
		case <-time.After(s.untilNextRun()):
		case <-s.wake:
			s.applyRequests()
		}
	}
}

func (s *Service) applyRequests() {
	s.mu.Lock()
	requested := s.requested
	s.requested = map[string]int64{}
	s.mu.Unlock()
	for _, item := range s.tasks {
		if nextAt, ok := requested[item.task.Name()]; ok {
			item.nextAt = nextAt
		}
	}
}

// Normally the next minute; sooner when a run was asked for.
func (s *Service) untilNextRun() time.Duration {
	now := s.now()
	wait := untilNextMinute(now)
	for _, item := range s.tasks {
		wait = min(wait, max(time.Unix(item.nextAt, 0).Sub(now), 0))
	}
	return wait
}

// Rows of tasks that no longer exist go, known tasks continue from their
// stored next run and new ones are scheduled from now.
func (s *Service) restore(ctx context.Context) error {
	names := make([]string, 0, len(s.tasks))
	for _, item := range s.tasks {
		names = append(names, item.task.Name())
	}
	if err := s.repo.PeriodicTasks().DeleteUnusedPeriodicTasks(ctx, names); err != nil {
		return err
	}

	schedules, err := s.repo.PeriodicTasks().GetPeriodicTaskSchedules(ctx)
	if err != nil {
		return err
	}
	stored := map[string]int64{}
	for _, schedule := range schedules {
		if schedule.NextRunAt != nil {
			stored[schedule.TaskIdentifier] = *schedule.NextRunAt
		}
	}

	now := s.now().Unix()
	for _, item := range s.tasks {
		name := item.task.Name()
		if nextAt, ok := stored[name]; ok {
			item.nextAt = nextAt
			s.log.Info("Found previously scheduled periodic task", "task", name, "nextAt", time.Unix(nextAt, 0).UTC())
			continue
		}
		item.nextAt = item.task.NextAt(now)
		s.log.Info("Scheduling first time run", "task", name, "nextAt", time.Unix(item.nextAt, 0).UTC())
		if err := s.repo.PeriodicTasks().SchedulePeriodicTask(ctx, name, item.nextAt); err != nil {
			return err
		}
	}
	return nil
}

// Due tasks run one after another; a run cut short by shutdown is not
// recorded, so it runs again after the restart.
func (s *Service) tick(ctx context.Context) {
	now := s.now().Unix()
	ran := false
	for _, item := range s.tasks {
		if now < item.nextAt {
			continue
		}
		name := item.task.Name()
		s.log.Debug("Running periodic task", "task", name)
		started := s.now()
		err := trigger(ctx, item.task)
		if ctx.Err() != nil {
			return
		}
		ran = true

		finished := s.now()
		run := repository.PeriodicTaskRun{
			TaskIdentifier: name,
			RanAt:          finished.Unix(),
			DurationMs:     finished.Sub(started).Milliseconds(),
			Successful:     err == nil,
		}
		if err != nil {
			s.log.Error("Periodic task failed", "task", name, "error", err)
			run.FailReason = err.Error()
		}
		item.nextAt = item.task.NextAt(s.now().Unix())
		run.NextRunAt = item.nextAt
		if err := s.repo.PeriodicTasks().SavePeriodicTaskRun(ctx, run); err != nil {
			s.log.Error("Could not save periodic task run", "task", name, "error", err)
		}
		s.bus.Publish(ctx, eventbus.PeriodicTaskRan{Task: name})
	}
	if ran {
		if err := s.repo.PeriodicTasks().DeletePeriodicTaskRunsBefore(ctx, s.now().Add(-s.history).Unix()); err != nil {
			s.log.Error("Could not remove old periodic task runs", "error", err)
		}
	}
}

// A panic is recorded like any failure, so the task is rescheduled instead
// of taking the whole scheduler down.
func trigger(ctx context.Context, task Task) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("panic: %v", rec)
		}
	}()
	return task.Trigger(ctx)
}

func untilNextMinute(now time.Time) time.Duration {
	return now.Truncate(time.Minute).Add(time.Minute).Sub(now)
}
