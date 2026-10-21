package tasks

import (
	"context"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/workers/periodictask"
)

type removeExpiredShareLinks struct {
	repo repository.Repository
	bus  *eventbus.Bus
}

func (removeExpiredShareLinks) Name() string {
	return RemoveExpiredShareLinks
}

func (removeExpiredShareLinks) NextAt(now int64) int64 {
	return periodictask.StartOfNextDay(now)
}

func (t removeExpiredShareLinks) Trigger(ctx context.Context) error {
	expired, err := t.repo.Shares().RemoveExpiredPublicShares(ctx)
	if err != nil {
		return err
	}
	for _, share := range expired {
		t.bus.Publish(ctx, eventbus.PublicShareExpired{OwnerID: share.OwnerId, NoteID: share.NoteId})
	}
	return nil
}
