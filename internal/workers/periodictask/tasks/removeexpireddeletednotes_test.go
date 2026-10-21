package tasks

import (
	"context"
	"io"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/logger"
)

func TestRemoveExpiredDeletedNotes(t *testing.T) {
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

	userID, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "a", Username: "a", Password: "password", Role: "admin", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}

	day := int64(24 * 60 * 60)
	nowUnix := time.Now().Unix()
	for _, deletedAt := range []int64{nowUnix - 31*day, nowUnix - 29*day} {
		if _, err := db.ExecContext(ctx, `INSERT INTO "note" ("title", "note", "user_id", "created_at", "updated_at", "is_deleted", "deleted_at") VALUES ('n', '', ?, 0, 0, true, ?)`, userID, deletedAt); err != nil {
			t.Fatal(err)
		}
	}

	bus := eventbus.New()
	var got []eventbus.NoteFullyDeleted
	bus.Subscribe(func(_ context.Context, e eventbus.NoteFullyDeleted) {
		got = append(got, e)
	})
	task := removeExpiredDeletedNotes{
		repo: repo,
		log:  logger.New(logger.Options{Level: "ERROR", Output: io.Discard}),
		bus:  bus,
	}

	if err := task.Trigger(ctx); err != nil {
		t.Fatal(err)
	}
	if want := []eventbus.NoteFullyDeleted{{UserID: userID, NoteID: 1}}; !slices.Equal(got, want) {
		t.Errorf("notified = %v, want %v", got, want)
	}
	if notes, _ := repo.FindDeletedNotes(ctx, userID, 0); len(notes) != 1 || notes[0].Id != 2 {
		t.Errorf("remaining = %+v", notes)
	}
}
