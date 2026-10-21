package tasks

import (
	"context"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/workers/periodictask"
)

const auditLogRetention = 365 * 24 * time.Hour

type cleanupAuditLog struct {
	repo repository.Repository
}

func (cleanupAuditLog) Name() string {
	return CleanupAuditLog
}

func (cleanupAuditLog) NextAt(now int64) int64 {
	return periodictask.StartOfNextDay(now)
}

func (t cleanupAuditLog) Trigger(ctx context.Context) error {
	return t.repo.AuditLog().DeleteAuditEntriesBefore(ctx, time.Now().Add(-auditLogRetention).Unix())
}
