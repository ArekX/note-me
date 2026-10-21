package tasks

import (
	"context"
	"io"
	"path/filepath"
	"slices"
	"testing"

	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/logger"
)

func TestCheckReminders(t *testing.T) {
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

	author, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Author", Username: "author", Password: "password", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	reader, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Reader", Username: "reader", Password: "password", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}

	newNote := func(title string) int64 {
		note, err := repo.CreateNote(ctx, repository.NewNoteRecord{Title: title, UserId: author})
		if err != nil {
			t.Fatal(err)
		}
		return note.Id
	}
	plan := newNote("Plan")
	deleted := newNote("Deleted")
	if _, err := repo.SetUserShare(ctx, author, plan, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}

	for _, reminder := range []struct {
		user int
		note int64
	}{{author, plan}, {reader, plan}, {author, deleted}} {
		if _, err := repo.SetReminder(ctx, reminder.user, reminder.note, repository.Reminder{Once: true, NextAt: 60}); err != nil {
			t.Fatal(err)
		}
	}
	if err := repo.DeleteNote(ctx, author, deleted); err != nil {
		t.Fatal(err)
	}

	bus := eventbus.New()
	var events []eventbus.NotificationCreated
	bus.Subscribe(func(_ context.Context, e eventbus.NotificationCreated) { events = append(events, e) })
	var triggered []eventbus.ReminderTriggered
	bus.Subscribe(func(_ context.Context, e eventbus.ReminderTriggered) { triggered = append(triggered, e) })

	task := checkReminders{repo: repo, log: logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), bus: bus}
	if err := task.Trigger(ctx); err != nil {
		t.Fatal(err)
	}

	if len(events) != 2 || events[0].UserID != author || events[1].UserID != reader {
		t.Fatalf("events = %+v", events)
	}
	if want := `{"type":"reminder-received","payload":{"id":1,"reminder_id":1,"title":"Plan","is_encrypted":false,"user_id":1,"user_name":"Author","type":"own"}}`; events[0].Data != want {
		t.Errorf("own data = %s", events[0].Data)
	}
	if want := `"type":"shared"}}`; events[1].Data[len(events[1].Data)-len(want):] != want {
		t.Errorf("shared data = %s", events[1].Data)
	}
	if want := []eventbus.ReminderTriggered{{UserID: author, NoteID: plan}, {UserID: reader, NoteID: plan}}; !slices.Equal(triggered, want) {
		t.Errorf("triggered = %+v, want %+v", triggered, want)
	}

	readerNotes, _ := repo.GetUserNotifications(ctx, reader)
	if len(readerNotes) != 1 || readerNotes[0].Id != events[1].ID {
		t.Errorf("reader notifications = %+v", readerNotes)
	}
	if data, _ := repo.GetNoteReminderData(ctx, author, plan); data != nil {
		t.Errorf("once reminder kept: %+v", data)
	}
	if data, _ := repo.GetNoteReminderData(ctx, author, deleted); data == nil {
		t.Error("reminder of a deleted note was resolved")
	}
}
