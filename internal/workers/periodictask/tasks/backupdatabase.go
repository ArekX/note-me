package tasks

import (
	"context"

	"noteme/internal/components/backups"
	"noteme/internal/eventbus"
	"noteme/internal/workers/periodictask"
)

// Daily at midnight UTC (decision 0.24).
type backupDatabase struct {
	backups *backups.Backups
	bus     *eventbus.Bus
}

func (backupDatabase) Name() string {
	return BackupDatabase
}

func (backupDatabase) NextAt(now int64) int64 {
	return periodictask.StartOfNextDay(now)
}

func (t backupDatabase) Trigger(ctx context.Context) error {
	err := t.backups.RunAutomatic(ctx)
	t.bus.Publish(ctx, eventbus.AutomaticBackupFinished{})
	return err
}
