package tasks

import (
	"context"
	"log/slog"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/workers/periodictask"
)

const deletedNoteRetentionDays = 30

type removeExpiredDeletedNotes struct {
	repo repository.Repository
	log  *slog.Logger
	bus  *eventbus.Bus
}

func (removeExpiredDeletedNotes) Name() string {
	return RemoveExpiredDeletedNotes
}

func (removeExpiredDeletedNotes) NextAt(now int64) int64 {
	return periodictask.StartOfNextDay(now)
}

func (t removeExpiredDeletedNotes) Trigger(ctx context.Context) error {
	notes, err := t.repo.Notes().RemoveExpiredDeletedNotes(ctx, deletedNoteRetentionDays)
	if err != nil {
		return err
	}

	t.log.Info("Removed expired deleted notes", "count", len(notes))
	for _, note := range notes {
		t.bus.Publish(ctx, eventbus.NoteFullyDeleted{UserID: note.UserId, NoteID: note.Id})
	}
	return nil
}
