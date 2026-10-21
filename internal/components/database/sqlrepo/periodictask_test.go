package sqlrepo

import (
	"context"
	"testing"

	"noteme/internal/components/repository"
)

func TestPeriodicTasks(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()

	if err := r.SchedulePeriodicTask(ctx, "a", 100); err != nil {
		t.Fatal(err)
	}
	if err := r.SchedulePeriodicTask(ctx, "b", 200); err != nil {
		t.Fatal(err)
	}
	if err := r.SchedulePeriodicTask(ctx, "a", 150); err != nil {
		t.Fatal(err)
	}
	schedules, err := r.GetPeriodicTaskSchedules(ctx)
	if err != nil || len(schedules) != 2 || schedules[0].TaskIdentifier != "a" || *schedules[0].NextRunAt != 150 || *schedules[1].NextRunAt != 200 {
		t.Fatalf("schedules = %+v, %v", schedules, err)
	}

	if err := r.SavePeriodicTaskRun(ctx, repository.PeriodicTaskRun{TaskIdentifier: "a", NextRunAt: 300, RanAt: 160, Successful: true}); err != nil {
		t.Fatal(err)
	}
	if err := r.SavePeriodicTaskRun(ctx, repository.PeriodicTaskRun{TaskIdentifier: "b", NextRunAt: 400, RanAt: 210}); err != nil {
		t.Fatal(err)
	}
	if err := r.SavePeriodicTaskRun(ctx, repository.PeriodicTaskRun{TaskIdentifier: "c", NextRunAt: 500, RanAt: 220, FailReason: "broken"}); err != nil {
		t.Fatal(err)
	}

	tasks, err := r.GetAllPeriodicTasks(ctx)
	if err != nil || len(tasks) != 3 {
		t.Fatalf("tasks = %+v, %v", tasks, err)
	}
	a, b, c := tasks[0], tasks[1], tasks[2]
	if *a.NextRunAt != 300 || !*a.IsLastRunSuccessful || *a.LastSuccessfulRunAt != 160 || a.LastFailReason != nil || a.LastFailRunAt != nil {
		t.Errorf("successful task = %+v", a)
	}
	if *b.IsLastRunSuccessful || *b.LastFailReason != "Unknown error" || *b.LastFailRunAt != 210 || b.LastSuccessfulRunAt != nil {
		t.Errorf("failed task without reason = %+v", b)
	}
	if c.TaskIdentifier != "c" || *c.LastFailReason != "broken" || *c.NextRunAt != 500 {
		t.Errorf("failed task = %+v", c)
	}

	if err := r.DeleteUnusedPeriodicTasks(ctx, []string{"a", "c"}); err != nil {
		t.Fatal(err)
	}
	if schedules, _ := r.GetPeriodicTaskSchedules(ctx); len(schedules) != 2 || schedules[0].TaskIdentifier != "a" || schedules[1].TaskIdentifier != "c" {
		t.Errorf("schedules after removing unused = %+v", schedules)
	}
	if err := r.DeleteUnusedPeriodicTasks(ctx, nil); err != nil {
		t.Fatal(err)
	}
	if schedules, _ := r.GetPeriodicTaskSchedules(ctx); len(schedules) != 0 {
		t.Errorf("schedules after removing all = %+v", schedules)
	}
}

func TestPeriodicTaskRuns(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()

	for _, run := range []repository.PeriodicTaskRun{
		{TaskIdentifier: "a", RanAt: 100, DurationMs: 5, Successful: true},
		{TaskIdentifier: "a", RanAt: 200, DurationMs: 7, FailReason: "broken"},
		{TaskIdentifier: "a", RanAt: 300, DurationMs: 2, Successful: true},
		{TaskIdentifier: "b", RanAt: 250, Successful: true},
	} {
		if err := r.SavePeriodicTaskRun(ctx, run); err != nil {
			t.Fatal(err)
		}
	}

	runs, err := r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "a", RanFrom: 150}, 1)
	if err != nil || runs.Total != 2 || runs.Results[0].RanAt != 300 || runs.Results[1].RanAt != 200 {
		t.Fatalf("runs since 150 = %+v, %v", runs, err)
	}
	if failed := runs.Results[1]; failed.IsSuccessful || *failed.FailReason != "broken" || failed.DurationMs != 7 || failed.TaskIdentifier != "a" {
		t.Errorf("failed run = %+v", failed)
	}
	if runs.Results[0].FailReason != nil || !runs.Results[0].IsSuccessful {
		t.Errorf("successful run = %+v", runs.Results[0])
	}

	successful := true
	runs, err = r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "a", Successful: &successful}, 1)
	if err != nil || runs.Total != 2 || runs.Results[0].RanAt != 300 || runs.Results[1].RanAt != 100 {
		t.Errorf("successful runs = %+v, %v", runs, err)
	}
	successful = false
	runs, err = r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "a", Successful: &successful}, 1)
	if err != nil || runs.Total != 1 || runs.Results[0].RanAt != 200 {
		t.Errorf("failed runs = %+v, %v", runs, err)
	}

	if err := r.DeletePeriodicTaskRunsBefore(ctx, 250); err != nil {
		t.Fatal(err)
	}
	runs, err = r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "a"}, 1)
	if err != nil || runs.Total != 1 || runs.Results[0].RanAt != 300 {
		t.Errorf("runs after removing old ones = %+v, %v", runs, err)
	}

	if err := r.DeleteUnusedPeriodicTasks(ctx, []string{"b"}); err != nil {
		t.Fatal(err)
	}
	if runs, _ := r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "a"}, 1); runs.Total != 0 {
		t.Errorf("runs of an unused task = %+v", runs)
	}
	if runs, _ := r.FindPeriodicTaskRuns(ctx, repository.PeriodicTaskRunFilters{TaskIdentifier: "b"}, 1); runs.Total != 1 {
		t.Errorf("runs of a used task = %+v", runs)
	}
}
