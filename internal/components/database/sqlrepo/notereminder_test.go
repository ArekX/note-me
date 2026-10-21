package sqlrepo

import (
	"context"
	"fmt"
	"testing"

	"noteme/internal/components/repository"
)

func setReminder(t *testing.T, r *Repository, userId int, noteId int64, reminder repository.Reminder) *repository.SetReminderResult {
	t.Helper()
	result, err := r.SetReminder(context.Background(), userId, noteId, reminder)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestSetReminderSchedules(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	id := newTestNote(t, r, owner, "Plan", nil)

	once := setReminder(t, r, owner, id, repository.Reminder{Once: true, NextAt: 1_700_000_059})
	if once.NextAt != 1_700_000_040 || once.Interval != nil || once.RepeatCount != 0 {
		t.Errorf("once = %+v", once)
	}

	before := now()
	repeat := setReminder(t, r, owner, id, repository.Reminder{Interval: 2, UnitValue: 3600, RepeatCount: 3})
	if repeat.NextAt%60 != 0 || repeat.NextAt < before+7200-60 || repeat.NextAt > now()+7200 || *repeat.Interval != 2 || *repeat.UnitValue != 3600 {
		t.Errorf("repeat = %+v", repeat)
	}

	if _, err := r.q.ExecContext(ctx, `UPDATE "note_reminder" SET "done_count" = 2`); err != nil {
		t.Fatal(err)
	}
	setReminder(t, r, owner, id, repository.Reminder{Once: true, NextAt: 1_699_999_980})
	data, err := r.GetNoteReminderData(ctx, owner, id)
	if err != nil || data.DoneCount != 2 || data.Interval != nil || data.NextAt != 1_699_999_980 {
		t.Errorf("after reset = %+v, %v", data, err)
	}
	var count int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_reminder"`).Scan(&count); err != nil || count != 1 {
		t.Errorf("reminder rows = %d, %v", count, err)
	}

	if err := r.RemoveReminder(ctx, owner, id); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetNoteReminderData(ctx, owner, id); data != nil {
		t.Errorf("removed reminder = %+v", data)
	}
}

func TestResolveReminderNextOccurrence(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	onceNote := newTestNote(t, r, owner, "Once", nil)
	repeatNote := newTestNote(t, r, owner, "Repeat", nil)
	deletedNote := newTestNote(t, r, owner, "Deleted", nil)

	setReminder(t, r, owner, onceNote, repository.Reminder{Once: true, NextAt: now() - 120})
	setReminder(t, r, owner, repeatNote, repository.Reminder{Interval: 1, UnitValue: 60, RepeatCount: 2})
	setReminder(t, r, owner, deletedNote, repository.Reminder{Once: true, NextAt: now() - 120})
	if _, err := r.q.ExecContext(ctx, `UPDATE "note_reminder" SET "next_at" = ? WHERE "note_id" = ?`, now()-60, repeatNote); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteNote(ctx, owner, deletedNote); err != nil {
		t.Fatal(err)
	}

	ready, err := r.GetReadyReminders(ctx)
	if err != nil || len(ready) != 2 || ready[0].NoteId != onceNote || ready[1].NoteId != repeatNote {
		t.Fatalf("ready = %+v, %v", ready, err)
	}

	for _, reminder := range ready {
		if err := r.ResolveReminderNextOccurrence(ctx, reminder.Id); err != nil {
			t.Fatal(err)
		}
	}
	if data, _ := r.GetNoteReminderData(ctx, owner, onceNote); data != nil {
		t.Errorf("once reminder kept: %+v", data)
	}
	data, _ := r.GetNoteReminderData(ctx, owner, repeatNote)
	if data == nil || data.DoneCount != 1 || data.NextAt <= now() {
		t.Fatalf("repeat after first run = %+v", data)
	}

	if err := r.ResolveReminderNextOccurrence(ctx, data.Id); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetNoteReminderData(ctx, owner, repeatNote); data != nil {
		t.Errorf("exhausted repeat kept: %+v", data)
	}
}

func TestFindAndSearchReminders(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	var notes []int64
	for i := range 12 {
		id := newTestNote(t, r, owner, "Plan", nil)
		setReminder(t, r, owner, id, repository.Reminder{Once: true, NextAt: 1_800_000_000 + int64(i/2)*60})
		notes = append(notes, id)
	}
	if _, err := r.SetUserShare(ctx, owner, notes[0], []int64{int64(other)}); err != nil {
		t.Fatal(err)
	}
	setReminder(t, r, other, notes[0], repository.Reminder{Once: true, NextAt: 1_699_999_980})

	page, err := r.FindUserReminderNotes(ctx, owner, repository.ReminderFilters{Limit: 50})
	if err != nil || len(page) != 10 || page[0].NoteId != notes[0] || page[0].Type != "once" || page[0].AuthorName != "owner" {
		t.Fatalf("first page = %+v, %v", page, err)
	}
	last := page[9]
	rest, err := r.FindUserReminderNotes(ctx, owner, repository.ReminderFilters{FromNextAt: last.NextAt, FromId: last.Id})
	if err != nil || len(rest) != 2 || rest[0].NoteId != notes[10] {
		t.Errorf("second page = %+v, %v", rest, err)
	}
	if small, _ := r.FindUserReminderNotes(ctx, owner, repository.ReminderFilters{Limit: 3}); len(small) != 3 {
		t.Errorf("limit 3 = %d", len(small))
	}

	results, err := r.SearchReminderNotes(ctx, owner, repository.SearchFilters{Query: "plan"})
	if err != nil || len(results) != 10 {
		t.Fatalf("search = %d, %v", len(results), err)
	}
	for _, result := range results {
		if result.NextAt == 1_699_999_980 {
			t.Errorf("another user's reminder leaked: %+v", result)
		}
	}
	if results, _ := r.SearchReminderNotes(ctx, other, repository.SearchFilters{Query: "plan"}); len(results) != 1 || results[0].NextAt != 1_699_999_980 {
		t.Errorf("other user search = %+v", results)
	}
}

func TestNotifications(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	kept := newTestNote(t, r, owner, "Kept", nil)
	gone := newTestNote(t, r, owner, "Gone", nil)

	first, err := r.CreateNotification(ctx, owner, `{"type":"reminder-received","payload":{"id":`+itoa(kept)+`}}`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNotification(ctx, owner, `{"type":"reminder-received","payload":{"id":`+itoa(gone)+`}}`); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNotification(ctx, other, `{"type":"note-shared","payload":{"id":`+itoa(kept)+`}}`); err != nil {
		t.Fatal(err)
	}

	list, err := r.GetUserNotifications(ctx, owner)
	if err != nil || len(list) != 2 || list[1].Id != first.Id || list[0].IsRead {
		t.Fatalf("list = %+v, %v", list, err)
	}

	if err := r.MarkSingleNotificationRead(ctx, other, first.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.MarkSingleNotificationRead(ctx, owner, first.Id); err != nil {
		t.Fatal(err)
	}
	list, _ = r.GetUserNotifications(ctx, owner)
	if !list[1].IsRead || list[0].IsRead {
		t.Errorf("after single read = %+v", list)
	}

	if err := r.DeleteNote(ctx, owner, gone); err != nil {
		t.Fatal(err)
	}
	if err := r.FullyDeleteNotes(ctx, []int64{gone}); err != nil {
		t.Fatal(err)
	}
	if list, _ := r.GetUserNotifications(ctx, owner); len(list) != 1 || list[0].Id != first.Id {
		t.Errorf("after full delete = %+v", list)
	}

	if err := r.DeleteSingleNotification(ctx, owner, first.Id); err != nil {
		t.Fatal(err)
	}
	if list, _ := r.GetUserNotifications(ctx, owner); len(list) != 0 {
		t.Errorf("after delete = %+v", list)
	}
	if err := r.MarkReadUserNotifications(ctx, other); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteUserNotifications(ctx, other); err != nil {
		t.Fatal(err)
	}
	if list, _ := r.GetUserNotifications(ctx, other); len(list) != 0 {
		t.Errorf("other after delete all = %+v", list)
	}
}

func itoa(id int64) string {
	return fmt.Sprint(id)
}

func TestGetNoteInfo(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	note := newTestNote(t, r, owner, "Shared", nil)
	deleted := newTestNote(t, r, owner, "Deleted", nil)
	if err := r.DeleteNote(ctx, owner, deleted); err != nil {
		t.Fatal(err)
	}

	info, err := r.GetNoteInfo(ctx, note)
	if err != nil || info == nil || info.Id != note || info.Title != "Shared" || info.UserName != "owner" || info.UserId != owner || info.IsEncrypted {
		t.Errorf("GetNoteInfo = %+v, %v", info, err)
	}
	if info, err := r.GetNoteInfo(ctx, deleted); err != nil || info != nil {
		t.Errorf("deleted note info = %+v, %v", info, err)
	}
}

// A reminder row without a share behind it (the window between revoking a
// share and its cleanup) is invisible everywhere.
func TestRemindersRequireOwnershipOrShare(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	note := newTestNote(t, r, owner, "Plan", nil)

	if _, err := r.SetUserShare(ctx, owner, note, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	setReminder(t, r, reader, note, repository.Reminder{Once: true, NextAt: now() - 60})
	setReminder(t, r, owner, note, repository.Reminder{Once: true, NextAt: now() - 60})

	visible := func() (int, int, int) {
		t.Helper()
		found, err := r.FindUserReminderNotes(ctx, reader, repository.ReminderFilters{})
		if err != nil {
			t.Fatal(err)
		}
		searched, err := r.SearchReminderNotes(ctx, reader, repository.SearchFilters{Query: "plan"})
		if err != nil {
			t.Fatal(err)
		}
		ready, err := r.GetReadyReminders(ctx)
		if err != nil {
			t.Fatal(err)
		}
		return len(found), len(searched), len(ready)
	}
	if found, searched, ready := visible(); found != 1 || searched != 1 || ready != 2 {
		t.Errorf("with share: found %d, searched %d, ready %d", found, searched, ready)
	}

	if _, err := r.q.ExecContext(ctx, `DELETE FROM "note_share_user"`); err != nil {
		t.Fatal(err)
	}
	if found, searched, ready := visible(); found != 0 || searched != 0 || ready != 1 {
		t.Errorf("without share: found %d, searched %d, ready %d", found, searched, ready)
	}
}
