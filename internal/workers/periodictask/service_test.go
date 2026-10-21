package periodictask

import (
	"context"
	"errors"
	"io"
	"path/filepath"
	"testing"
	"time"

	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/logger"
)

type fakeTask struct {
	name   string
	runs   int
	err    error
	panics bool
	onRun  func()
}

func (t *fakeTask) Name() string           { return t.name }
func (t *fakeTask) NextAt(now int64) int64 { return NextHour(now) }
func (t *fakeTask) Trigger(context.Context) error {
	t.runs++
	if t.onRun != nil {
		t.onRun()
	}
	if t.panics {
		panic("boom")
	}
	return t.err
}

func setup(t *testing.T, tasks ...Task) (*Service, repository.Repository, *time.Time) {
	t.Helper()
	ctx := context.Background()
	db, err := sqlite.Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	repo := sqlrepo.New(db, "sqlite")
	now := time.Date(2026, 10, 19, 13, 30, 0, 0, time.UTC)
	s := New(logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), repo, eventbus.New(), 30, tasks...)
	s.now = func() time.Time { return now }
	return s, repo, &now
}

func tasksByName(t *testing.T, repo repository.Repository) map[string]repository.PeriodicTaskRecord {
	t.Helper()
	records, err := repo.PeriodicTasks().GetAllPeriodicTasks(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	result := map[string]repository.PeriodicTaskRecord{}
	for _, record := range records {
		result[record.TaskIdentifier] = record
	}
	return result
}

func TestRestoreAndCatchUp(t *testing.T) {
	ctx := context.Background()
	missed := &fakeTask{name: "missed"}
	fresh := &fakeTask{name: "fresh"}
	s, repo, now := setup(t, missed, fresh)

	// Due two hours ago while the server was down.
	if err := repo.PeriodicTasks().SchedulePeriodicTask(ctx, "missed", now.Add(-2*time.Hour).Unix()); err != nil {
		t.Fatal(err)
	}
	if err := repo.PeriodicTasks().SchedulePeriodicTask(ctx, "removed-task", now.Unix()); err != nil {
		t.Fatal(err)
	}

	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}
	stored := tasksByName(t, repo)
	if _, ok := stored["removed-task"]; ok {
		t.Error("unused task kept")
	}
	nextHour := time.Date(2026, 10, 19, 14, 0, 0, 0, time.UTC).Unix()
	if record, ok := stored["fresh"]; !ok || *record.NextRunAt != nextHour {
		t.Errorf("fresh task = %+v", record)
	}

	s.tick(ctx)
	s.tick(ctx)
	if missed.runs != 1 {
		t.Errorf("missed task ran %d times, want once", missed.runs)
	}
	if fresh.runs != 0 {
		t.Errorf("fresh task ran %d times before it was due", fresh.runs)
	}
	record := tasksByName(t, repo)["missed"]
	if *record.NextRunAt != nextHour || !*record.IsLastRunSuccessful || *record.LastSuccessfulRunAt != now.Unix() {
		t.Errorf("missed task after run = %+v", record)
	}

	// A restart keeps the stored schedule.
	restarted := New(s.log, repo, s.bus, 30, missed, fresh)
	restarted.now = s.now
	if err := restarted.restore(ctx); err != nil {
		t.Fatal(err)
	}
	*now = now.Add(31 * time.Minute)
	restarted.tick(ctx)
	if missed.runs != 2 || fresh.runs != 1 {
		t.Errorf("after restart: missed %d, fresh %d runs", missed.runs, fresh.runs)
	}
}

func TestRunsArePublished(t *testing.T) {
	ctx := context.Background()
	due := &fakeTask{name: "due", err: errors.New("disk full")}
	s, _, now := setup(t, due, &fakeTask{name: "later"})
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}
	var ran []string
	s.bus.Subscribe(func(_ context.Context, e eventbus.PeriodicTaskRan) { ran = append(ran, e.Task) })

	s.tick(ctx)
	if len(ran) != 0 {
		t.Errorf("published before a run: %v", ran)
	}
	s.tasks[1].nextAt = now.Add(2 * time.Hour).Unix()
	*now = now.Add(time.Hour)
	s.tick(ctx)
	if len(ran) != 1 || ran[0] != "due" {
		t.Errorf("published runs = %v, want [due]", ran)
	}
}

func TestFailureBookkeeping(t *testing.T) {
	ctx := context.Background()
	task := &fakeTask{name: "task", err: errors.New("disk full")}
	s, repo, now := setup(t, task)
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}

	*now = now.Add(time.Hour)
	s.tick(ctx)
	record := tasksByName(t, repo)["task"]
	if *record.IsLastRunSuccessful || *record.LastFailReason != "disk full" || *record.LastFailRunAt != now.Unix() || record.LastSuccessfulRunAt != nil {
		t.Errorf("after failure = %+v", record)
	}

	task.err = errors.New("")
	*now = now.Add(time.Hour)
	s.tick(ctx)
	if record := tasksByName(t, repo)["task"]; *record.LastFailReason != "Unknown error" {
		t.Errorf("empty error reason = %q", *record.LastFailReason)
	}

	task.err = nil
	failedAt := now.Unix()
	*now = now.Add(time.Hour)
	s.tick(ctx)
	record = tasksByName(t, repo)["task"]
	if !*record.IsLastRunSuccessful || *record.LastSuccessfulRunAt != now.Unix() || *record.LastFailRunAt != failedAt {
		t.Errorf("after success = %+v", record)
	}
}

func TestRunHistory(t *testing.T) {
	ctx := context.Background()
	task := &fakeTask{name: "task"}
	s, repo, now := setup(t, task)
	task.onRun = func() { *now = now.Add(1500 * time.Millisecond) }
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}

	*now = now.Add(time.Hour)
	s.tick(ctx)
	task.err = errors.New("disk full")
	*now = now.Add(29 * 24 * time.Hour)
	s.tick(ctx)

	runs, err := repo.PeriodicTasks().FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "task"}, 1)
	if err != nil || runs.Total != 2 {
		t.Fatalf("runs = %+v, %v", runs, err)
	}
	failed, first := runs.Results[0], runs.Results[1]
	if failed.IsSuccessful || *failed.FailReason != "disk full" || failed.RanAt != now.Unix() || failed.DurationMs != 1500 {
		t.Errorf("failed run = %+v", failed)
	}
	if !first.IsSuccessful || first.FailReason != nil {
		t.Errorf("first run = %+v", first)
	}

	*now = now.Add(2 * 24 * time.Hour)
	s.tick(ctx)
	runs, err = repo.PeriodicTasks().FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "task"}, 1)
	if err != nil || runs.Total != 2 || runs.Results[1].RanAt != failed.RanAt {
		t.Errorf("runs after 31 days = %+v, %v", runs, err)
	}
}

func TestShutdownDuringRunIsNotRecorded(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	task := &fakeTask{name: "task", onRun: cancel}
	s, repo, now := setup(t, task)
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}
	scheduled := *tasksByName(t, repo)["task"].NextRunAt

	*now = now.Add(time.Hour)
	s.tick(ctx)
	record := tasksByName(t, repo)["task"]
	if *record.NextRunAt != scheduled || record.IsLastRunSuccessful != nil {
		t.Errorf("interrupted run recorded: %+v", record)
	}
}

func TestPanicIsRecordedAsFailure(t *testing.T) {
	ctx := context.Background()
	task := &fakeTask{name: "task", panics: true}
	after := &fakeTask{name: "after"}
	s, repo, now := setup(t, task, after)
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}

	*now = now.Add(time.Hour)
	s.tick(ctx)
	record := tasksByName(t, repo)["task"]
	if *record.IsLastRunSuccessful || *record.LastFailReason != "panic: boom" || *record.NextRunAt != NextHour(now.Unix()) {
		t.Errorf("after panic = %+v", record)
	}
	if after.runs != 1 {
		t.Errorf("task after the panicking one ran %d times", after.runs)
	}
	s.tick(ctx)
	if task.runs != 1 {
		t.Errorf("panicking task ran %d times in the same hour", task.runs)
	}
}

func TestRunRetriesRestoreUntilStopped(t *testing.T) {
	ctx := context.Background()
	db, err := sqlite.Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	db.Close()
	s := New(logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), sqlrepo.New(db, "sqlite"), eventbus.New(), 30, &fakeTask{name: "task"})

	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan error, 1)
	go func() { done <- s.Run(runCtx) }()
	time.Sleep(100 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Run() = %v, want nil while retrying", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Run() did not stop after cancel")
	}
}

func TestRunRequestedByUser(t *testing.T) {
	ctx := context.Background()
	task := &fakeTask{name: "backup"}
	s, repo, now := setup(t, task, &fakeTask{name: "other"})
	if err := s.restore(ctx); err != nil {
		t.Fatal(err)
	}
	*now = now.Add(15 * time.Second)
	if wait := s.untilNextRun(); wait != 45*time.Second {
		t.Errorf("wait before a request = %v", wait)
	}

	s.bus.Publish(ctx, eventbus.PeriodicTaskRunRequested{Task: "backup", NextRunAt: now.Unix() + 1})
	s.bus.Publish(ctx, eventbus.PeriodicTaskRunRequested{Task: "removed", NextRunAt: now.Unix() + 1})
	select {
	case <-s.wake:
	default:
		t.Fatal("request did not wake the scheduler")
	}
	s.applyRequests()
	if wait := s.untilNextRun(); wait != time.Second {
		t.Errorf("wait after a request = %v", wait)
	}

	*now = now.Add(time.Second)
	s.tick(ctx)
	if task.runs != 1 {
		t.Fatalf("requested task ran %d times", task.runs)
	}
	runs, err := repo.PeriodicTasks().FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "backup"}, 1)
	if err != nil || runs.Total != 1 {
		t.Errorf("recorded runs = %+v, %v", runs, err)
	}
	nextHour := time.Date(2026, 10, 19, 14, 0, 0, 0, time.UTC).Unix()
	if record := tasksByName(t, repo)["backup"]; *record.NextRunAt != nextHour {
		t.Errorf("next run after the requested one = %d", *record.NextRunAt)
	}
}
