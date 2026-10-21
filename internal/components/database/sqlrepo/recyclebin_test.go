package sqlrepo

import (
	"context"
	"fmt"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func countNoteRows(t *testing.T, r *Repository, noteId int64) map[string]int {
	t.Helper()
	counts := map[string]int{}
	for _, table := range []string{"note_tag_note", "group_note", "note_history", "note_reminder", "note_share_link", "note_share_user"} {
		var count int
		if err := r.q.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "`+table+`" WHERE "note_id" = ?`, noteId).Scan(&count); err != nil {
			t.Fatal(err)
		}
		counts[table] = count
	}
	var count int
	if err := r.q.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "note" WHERE "id" = ?`, noteId).Scan(&count); err != nil {
		t.Fatal(err)
	}
	counts["note"] = count
	return counts
}

func addNoteRelations(t *testing.T, r *Repository, noteId int64, userId int) {
	t.Helper()
	inserts := []struct {
		query string
		args  []any
	}{
		{`INSERT INTO "note_history" ("note_id", "version", "title", "tags", "note", "is_encrypted", "created_at") VALUES (?, 'v1', 't', '', '', false, 0)`, []any{noteId}},
		{`INSERT INTO "note_reminder" ("note_id", "user_id", "next_at") VALUES (?, ?, 0)`, []any{noteId, userId}},
		{`INSERT INTO "note_share_link" ("identifier", "note_id", "created_at") VALUES (?, ?, 0)`, []any{fmt.Sprint("link-", noteId), noteId}},
		{`INSERT INTO "note_share_user" ("note_id", "user_id", "created_at") VALUES (?, ?, 0)`, []any{noteId, userId}},
	}
	for _, insert := range inserts {
		if _, err := r.q.ExecContext(context.Background(), insert.query, insert.args...); err != nil {
			t.Fatal(err)
		}
	}
}

func TestFullyDeleteNotesLeavesNoOrphans(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	group := createTestGroup(t, r, owner, "Work", nil)

	gone := newTestNote(t, r, owner, "Gone", &group, "a")
	kept := newTestNote(t, r, owner, "Kept", nil, "a")
	addNoteRelations(t, r, gone, other)
	addNoteRelations(t, r, kept, other)

	notifications := []string{
		fmt.Sprintf(`{"type":"reminder-received","payload":{"id":%d}}`, gone),
		fmt.Sprintf(`{"type":"reminder-received","payload":{"id":%d}}`, kept),
		`{"type":"data-export-ready","payload":{"id":"export"}}`,
		`{"type":"other"}`,
	}
	for _, data := range notifications {
		if _, err := r.CreateNotification(ctx, other, data); err != nil {
			t.Fatal(err)
		}
	}

	if err := r.FullyDeleteNotes(ctx, []int64{gone}); err != nil {
		t.Fatal(err)
	}

	remaining, err := r.GetUserNotifications(ctx, other)
	if err != nil {
		t.Fatal(err)
	}
	if len(remaining) != 3 || slices.ContainsFunc(remaining, func(n repository.NotificationRecord) bool { return n.Data == notifications[0] }) {
		t.Errorf("notifications = %+v, want all but the deleted note's", remaining)
	}

	for table, count := range countNoteRows(t, r, gone) {
		if count != 0 {
			t.Errorf("%s still has %d rows for the deleted note", table, count)
		}
	}
	for table, count := range countNoteRows(t, r, kept) {
		if count != 1 {
			t.Errorf("%s has %d rows for the kept note", table, count)
		}
	}
}

func TestRestoreDeletedNote(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	group := createTestGroup(t, r, owner, "Work", nil)

	id := newTestNote(t, r, owner, "Plan", &group)

	if restored, err := r.RestoreDeletedNote(ctx, owner, id); err != nil || restored {
		t.Errorf("restore of a live note = %v, %v", restored, err)
	}
	if note, _ := r.GetNote(ctx, owner, id); note == nil || note.GroupId == nil {
		t.Fatalf("live note changed: %+v", note)
	}

	if err := r.DeleteNote(ctx, owner, id); err != nil {
		t.Fatal(err)
	}
	if restored, err := r.RestoreDeletedNote(ctx, other, id); err != nil || restored {
		t.Errorf("restore by another user = %v, %v", restored, err)
	}

	restored, err := r.RestoreDeletedNote(ctx, owner, id)
	if err != nil || !restored {
		t.Fatalf("restore = %v, %v", restored, err)
	}
	note, err := r.GetNote(ctx, owner, id)
	if err != nil || note == nil || note.GroupId != nil {
		t.Errorf("restored note = %+v, %v", note, err)
	}
	if got := treeNames(t, r, owner, nil, "note"); !slices.Equal(got, []string{"Plan"}) {
		t.Errorf("top level notes = %v", got)
	}
	if counts := countNoteRows(t, r, id); counts["group_note"] != 1 {
		t.Errorf("group_note rows = %d", counts["group_note"])
	}
}

func TestFindAndRemoveExpiredDeletedNotes(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	var ids []int64
	for range 12 {
		id := newTestNote(t, r, owner, "Note", nil)
		if err := r.DeleteNote(ctx, owner, id); err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
	}
	live := newTestNote(t, r, owner, "Live", nil)
	theirs := newTestNote(t, r, other, "Theirs", nil)
	if err := r.DeleteNote(ctx, other, theirs); err != nil {
		t.Fatal(err)
	}

	page, err := r.FindDeletedNotes(ctx, owner, 0)
	if err != nil || len(page) != 10 || page[0].Id != ids[0] || page[0].DeletedAt == nil {
		t.Fatalf("first page = %+v, %v", page, err)
	}
	if page, _ := r.FindDeletedNotes(ctx, owner, page[9].Id); len(page) != 2 {
		t.Errorf("second page = %+v", page)
	}

	day := int64(24 * 60 * 60)
	if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "deleted_at" = ? WHERE "id" IN (?, ?)`, now()-31*day, ids[0], theirs); err != nil {
		t.Fatal(err)
	}
	if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "deleted_at" = ? WHERE "id" = ?`, now()-29*day, ids[1]); err != nil {
		t.Fatal(err)
	}
	if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "deleted_at" = ? WHERE "id" = ?`, now()-40*day, live); err != nil {
		t.Fatal(err)
	}

	removed, err := r.RemoveExpiredDeletedNotes(ctx, 30)
	if err != nil {
		t.Fatal(err)
	}
	if want := []repository.RemovedNote{{Id: ids[0], UserId: owner}, {Id: theirs, UserId: other}}; !slices.Equal(removed, want) {
		t.Errorf("removed = %v, want %v", removed, want)
	}
	for _, id := range []int64{ids[1], live} {
		if counts := countNoteRows(t, r, id); counts["note"] != 1 {
			t.Errorf("note %d was removed", id)
		}
	}
}

func TestSearchDeletedNotes(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")

	newTestNote(t, r, owner, "Shopping live", nil)
	deleted := newTestNote(t, r, owner, "Shopping old", nil)
	if err := r.DeleteNote(ctx, owner, deleted); err != nil {
		t.Fatal(err)
	}

	records, err := r.SearchDeletedNotes(ctx, owner, repository.SearchFilters{Query: "shopping"})
	if err != nil || len(records) != 1 || records[0].Title != "Shopping old" || records[0].DeletedAt == nil {
		t.Errorf("records = %+v, %v", records, err)
	}
}
