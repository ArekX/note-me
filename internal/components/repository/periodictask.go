package repository

import "context"

type PeriodicTaskSchedule struct {
	TaskIdentifier string
	NextRunAt      *int64
}

type PeriodicTaskRun struct {
	TaskIdentifier string
	NextRunAt      int64
	RanAt          int64
	DurationMs     int64
	// Empty for a successful run.
	FailReason string
	Successful bool
}

type PeriodicTaskRunRecord struct {
	Id             int64
	TaskIdentifier string
	RanAt          int64
	DurationMs     int64
	IsSuccessful   bool
	FailReason     *string
}

type PeriodicTaskRunFilters struct {
	TaskIdentifier string
	RanFrom        int64
	// nil lists every outcome.
	Successful *bool
}

type PeriodicTaskRecord struct {
	TaskIdentifier      string
	NextRunAt           *int64
	IsLastRunSuccessful *bool
	LastSuccessfulRunAt *int64
	LastFailReason      *string
	LastFailRunAt       *int64
}

type PeriodicTasks interface {
	GetPeriodicTaskSchedules(ctx context.Context) ([]PeriodicTaskSchedule, error)
	SchedulePeriodicTask(ctx context.Context, taskIdentifier string, nextRunAt int64) error
	SavePeriodicTaskRun(ctx context.Context, run PeriodicTaskRun) error
	GetAllPeriodicTasks(ctx context.Context) ([]PeriodicTaskRecord, error)
	DeleteUnusedPeriodicTasks(ctx context.Context, inUse []string) error
	FindPeriodicTaskRuns(ctx context.Context, filters PeriodicTaskRunFilters, page int) (*Paged[PeriodicTaskRunRecord], error)
	DeletePeriodicTaskRunsBefore(ctx context.Context, ranBefore int64) error
}
