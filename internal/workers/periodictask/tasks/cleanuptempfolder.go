package tasks

import (
	"context"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/workers/periodictask"
)

// Uploads and exports older than this were abandoned.
const tempFileMaxAge = 6 * time.Hour

type cleanupTempFolder struct {
	storage *storage.Storage
	repo    repository.Repository
}

func (cleanupTempFolder) Name() string {
	return CleanupTempFolder
}

func (cleanupTempFolder) NextAt(now int64) int64 {
	return periodictask.NextHour(now)
}

func (t cleanupTempFolder) Trigger(ctx context.Context) error {
	if err := t.storage.CleanupOldTempFiles(tempFileMaxAge); err != nil {
		return err
	}
	return t.repo.Files().DeleteStaleUploads(ctx, time.Now().Add(-tempFileMaxAge).Unix())
}
