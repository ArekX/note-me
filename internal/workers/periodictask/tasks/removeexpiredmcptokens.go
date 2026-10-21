package tasks

import (
	"context"
	"log/slog"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/workers/periodictask"
)

type removeExpiredMCPTokens struct {
	repo repository.Repository
	log  *slog.Logger
}

func (removeExpiredMCPTokens) Name() string {
	return RemoveExpiredMCPTokens
}

func (removeExpiredMCPTokens) NextAt(now int64) int64 {
	return periodictask.NextHour(now)
}

func (t removeExpiredMCPTokens) Trigger(ctx context.Context) error {
	count, err := t.repo.MCP().DeleteExpiredTokens(ctx, time.Now().Unix())
	if err != nil {
		return err
	}

	t.log.Info("Removed expired MCP tokens", "count", count)
	return nil
}
