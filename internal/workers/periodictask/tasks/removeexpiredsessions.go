package tasks

import (
	"context"
	"noteme/internal/components/repository"
	"noteme/internal/workers/periodictask"
)

type removeExpiredSessions struct {
	repo repository.Repository
}

func (removeExpiredSessions) Name() string {
	return RemoveExpiredSessions
}

func (removeExpiredSessions) NextAt(now int64) int64 {
	return periodictask.NextHour(now)
}

func (t removeExpiredSessions) Trigger(ctx context.Context) error {
	return t.repo.Sessions().DeleteExpiredSessions(ctx)
}
