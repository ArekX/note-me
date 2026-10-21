package sqlrepo

import (
	"context"
	"errors"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func newTestNote(t *testing.T, r *Repository, userId int, title string, groupId *int64, tags ...string) int64 {
	t.Helper()
	ctx := context.Background()
	record, err := r.CreateNote(ctx, repository.NewNoteRecord{Title: title, Note: "text of " + title, UserId: userId})
	if err != nil {
		t.Fatal(err)
	}
	if err := r.AssignNoteToGroup(ctx, userId, record.Id, groupId); err != nil {
		t.Fatal(err)
	}
	if err := r.LinkNoteWithTags(ctx, userId, record.Id, tags); err != nil {
		t.Fatal(err)
	}
	return record.Id
}

func TestGetNote(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	group := createTestGroup(t, r, owner, "Work", nil)

	id := newTestNote(t, r, owner, "Plan", &group, "b", "a")

	note, err := r.GetNote(ctx, owner, id)
	if err != nil {
		t.Fatal(err)
	}
	slices.Sort(note.Tags)
	if note.Title != "Plan" || note.Note != "text of Plan" || *note.GroupId != group || *note.GroupName != "Work" || !slices.Equal(note.Tags, []string{"a", "b"}) {
		t.Errorf("note = %+v", note)
	}

	if note, err := r.GetNote(ctx, other, id); err != nil || note != nil {
		t.Errorf("other user got %+v, %v", note, err)
	}

	rootId := newTestNote(t, r, owner, "Loose", nil)
	if note, err := r.GetNote(ctx, owner, rootId); err != nil || note.GroupId != nil || note.GroupName != nil || len(note.Tags) != 0 {
		t.Errorf("root note = %+v, %v", note, err)
	}

	if err := r.DeleteNote(ctx, owner, id); err != nil {
		t.Fatal(err)
	}
	if note, err := r.GetNote(ctx, owner, id); err != nil || note != nil {
		t.Errorf("deleted note = %+v, %v", note, err)
	}
}

func TestAssignNoteToForeignGroup(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	foreign := createTestGroup(t, r, other, "Theirs", nil)

	record, err := r.CreateNote(ctx, repository.NewNoteRecord{Title: "Mine", UserId: owner})
	if err != nil {
		t.Fatal(err)
	}
	if err := r.AssignNoteToGroup(ctx, owner, record.Id, &foreign); !errors.Is(err, repository.ErrGroupNotFound) {
		t.Errorf("assign err = %v", err)
	}

	id := newTestNote(t, r, owner, "Moved", nil)
	if err := r.UpdateNoteParent(ctx, owner, id, &foreign); !errors.Is(err, repository.ErrGroupNotFound) {
		t.Errorf("move err = %v", err)
	}
}

func TestUpdateNote(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	id := newTestNote(t, r, owner, "Plan", nil)

	empty := ""
	encrypted := true
	if err := r.UpdateNote(ctx, owner, id, repository.NoteUpdate{Note: &empty, IsEncrypted: &encrypted}); err != nil {
		t.Fatal(err)
	}
	title := "Stolen"
	if err := r.UpdateNote(ctx, other, id, repository.NoteUpdate{Title: &title}); err != nil {
		t.Fatal(err)
	}

	details, err := r.GetNoteDetails(ctx, owner, id, repository.NoteDetailsOptions{IncludeTitle: true, IncludeNote: true})
	if err != nil {
		t.Fatal(err)
	}
	if details.Title != "Plan" || details.Note != "" || !details.IsEncrypted {
		t.Errorf("details = %+v", details)
	}
}

func TestNoteWidth(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")

	record, err := r.CreateNote(ctx, repository.NewNoteRecord{Title: "Wide", UserId: owner, IsWide: true})
	if err != nil {
		t.Fatal(err)
	}
	if err := r.AssignNoteToGroup(ctx, owner, record.Id, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "updated_at" = 100 WHERE "id" = ?`, record.Id); err != nil {
		t.Fatal(err)
	}

	narrow := false
	if err := r.UpdateNote(ctx, owner, record.Id, repository.NoteUpdate{IsWide: &narrow}); err != nil {
		t.Fatal(err)
	}
	note, err := r.GetNote(ctx, owner, record.Id)
	if err != nil || note.IsWide || note.UpdatedAt != 100 {
		t.Errorf("note after width change = %+v, %v", note, err)
	}
	if err := r.UpdateNote(ctx, owner, record.Id, repository.NoteUpdate{}); err != nil {
		t.Errorf("empty update = %v", err)
	}

	if _, err := r.SetUserShare(ctx, owner, record.Id, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	shared, err := r.GetUserShareNote(ctx, reader, record.Id)
	if err != nil || shared == nil || shared.IsWide {
		t.Errorf("shared note = %+v, %v", shared, err)
	}
}

func TestGetNoteDetailsOptions(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	stranger := createTestUser(t, r, "stranger")
	group := createTestGroup(t, r, owner, "Work", nil)
	id := newTestNote(t, r, owner, "Plan", &group)

	if _, err := r.q.ExecContext(ctx, `INSERT INTO "note_share_user" ("note_id", "user_id", "created_at") VALUES (?, ?, ?)`, id, reader, now()); err != nil {
		t.Fatal(err)
	}

	bare, err := r.GetNoteDetails(ctx, owner, id, repository.NoteDetailsOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if *bare.GroupId != 0 || *bare.GroupName != "" || bare.CreatedAt != 0 || bare.UserName != "" || bare.Title != "" || bare.Note != "" {
		t.Errorf("bare details = %+v", bare)
	}

	all := repository.NoteDetailsOptions{IncludeGroup: true, IncludeTimestamp: true, IncludeUser: true, IncludeTitle: true, IncludeNote: true}
	full, err := r.GetNoteDetails(ctx, owner, id, all)
	if err != nil {
		t.Fatal(err)
	}
	if *full.GroupId != group || *full.GroupName != "Work" || full.CreatedAt == 0 || full.UserName != "owner" || full.Title != "Plan" {
		t.Errorf("full details = %+v", full)
	}

	shared, err := r.GetNoteDetails(ctx, reader, id, all)
	if err != nil || shared == nil || shared.GroupId != nil || shared.UserName != "owner" {
		t.Errorf("shared details = %+v, %v", shared, err)
	}

	if hidden, err := r.GetNoteDetails(ctx, stranger, id, all); err != nil || hidden != nil {
		t.Errorf("stranger details = %+v, %v", hidden, err)
	}
}

func TestNoteExistsAndDelete(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	id := newTestNote(t, r, owner, "Plan", nil)

	check := func(userId int, deleted, want bool) {
		t.Helper()
		if got, err := r.NoteExists(ctx, userId, id, deleted); err != nil || got != want {
			t.Errorf("NoteExists(user %d, deleted %v) = %v, %v", userId, deleted, got, err)
		}
	}

	check(owner, false, true)
	check(other, false, false)

	if err := r.DeleteNote(ctx, other, id); err != nil {
		t.Fatal(err)
	}
	check(owner, false, true)

	if err := r.DeleteNote(ctx, owner, id); err != nil {
		t.Fatal(err)
	}
	check(owner, false, false)
	check(owner, true, true)

	var deletedAt *int64
	if err := r.q.QueryRowContext(ctx, `SELECT "deleted_at" FROM "note" WHERE "id" = ?`, id).Scan(&deletedAt); err != nil || deletedAt == nil {
		t.Errorf("deleted_at = %v, %v", deletedAt, err)
	}
}

func TestFindRecentlyOpenedNotes(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	ids := []int64{}
	for _, title := range []string{"one", "two", "three", "four", "five", "six"} {
		ids = append(ids, newTestNote(t, r, owner, title, nil))
	}
	newTestNote(t, r, other, "foreign", nil)

	for index, id := range ids {
		if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "last_open_at" = ? WHERE "id" = ?`, 1000+index, id); err != nil {
			t.Fatal(err)
		}
	}
	if err := r.DeleteNote(ctx, owner, ids[5]); err != nil {
		t.Fatal(err)
	}

	records, err := r.FindRecentlyOpenedNotes(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	titles := []string{}
	for _, record := range records {
		titles = append(titles, record.Title)
	}
	if !slices.Equal(titles, []string{"five", "four", "three", "two", "one"}) {
		t.Errorf("titles = %v", titles)
	}

	if err := r.UpdateLastOpenAt(ctx, owner, ids[0]); err != nil {
		t.Fatal(err)
	}
	if records, _ := r.FindRecentlyOpenedNotes(ctx, owner); records[0].Title != "one" {
		t.Errorf("first after open = %v", records[0].Title)
	}
}

func TestCreateNoteRollsBackWithTransaction(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	missing := int64(99)

	err := r.runInTransaction(ctx, func(tx *Repository) error {
		record, err := tx.CreateNote(ctx, repository.NewNoteRecord{Title: "Lost", UserId: owner})
		if err != nil {
			return err
		}
		if err := tx.LinkNoteWithTags(ctx, owner, record.Id, []string{"kept"}); err != nil {
			return err
		}
		return tx.AssignNoteToGroup(ctx, owner, record.Id, &missing)
	})
	if !errors.Is(err, repository.ErrGroupNotFound) {
		t.Fatalf("err = %v", err)
	}

	var notes, tags int
	if err := r.q.QueryRowContext(ctx, `SELECT (SELECT COUNT(*) FROM "note"), (SELECT COUNT(*) FROM "note_tag")`).Scan(&notes, &tags); err != nil {
		t.Fatal(err)
	}
	if notes != 0 || tags != 0 {
		t.Errorf("notes = %d, tags = %d after rollback", notes, tags)
	}
}

func TestUpdateNoteParent(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	group := createTestGroup(t, r, owner, "Work", nil)
	foreign := createTestGroup(t, r, other, "Theirs", nil)
	note := newTestNote(t, r, owner, "Note", nil)

	if err := r.UpdateNoteParent(ctx, owner, note, &group); err != nil {
		t.Fatal(err)
	}
	if record, _ := r.GetNote(ctx, owner, note); record.GroupId == nil || *record.GroupId != group {
		t.Errorf("note in group = %+v", record)
	}
	if err := r.UpdateNoteParent(ctx, owner, note, &foreign); !errors.Is(err, repository.ErrGroupNotFound) {
		t.Errorf("move into a foreign group error = %v", err)
	}
	if err := r.UpdateNoteParent(ctx, owner, note, nil); err != nil {
		t.Fatal(err)
	}
	if record, _ := r.GetNote(ctx, owner, note); record.GroupId != nil {
		t.Errorf("note on the top level = %+v", record)
	}
}

func TestUserNoteAndFileCounts(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	newTestNote(t, r, owner, "One", nil)
	deleted := newTestNote(t, r, owner, "Deleted", nil)
	newTestNote(t, r, other, "Theirs", nil)
	if err := r.DeleteNote(ctx, owner, deleted); err != nil {
		t.Fatal(err)
	}
	createTestFile(t, r, owner, "a", "a.txt", true)
	createTestFile(t, r, owner, "b", "b.txt", false)
	createTestFile(t, r, other, "c", "c.txt", true)

	if count, err := r.GetUserNoteCount(ctx, owner); err != nil || count != 1 {
		t.Errorf("GetUserNoteCount = %d, %v", count, err)
	}
	if count, err := r.GetUserFileCount(ctx, owner); err != nil || count != 1 {
		t.Errorf("GetUserFileCount = %d, %v", count, err)
	}
}

func TestNoteDetailsOfDeletedNotes(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	note := newTestNote(t, r, owner, "Old plan", nil)
	if _, err := r.SetUserShare(ctx, owner, note, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteNote(ctx, owner, note); err != nil {
		t.Fatal(err)
	}

	withDeleted := repository.NoteDetailsOptions{IncludeTitle: true, IncludeDeleted: true}
	if got, err := r.GetNoteDetails(ctx, owner, note, repository.NoteDetailsOptions{IncludeTitle: true}); err != nil || got != nil {
		t.Errorf("deleted note without the option = %+v, %v", got, err)
	}
	if got, err := r.GetNoteDetails(ctx, owner, note, withDeleted); err != nil || got == nil || !got.IsDeleted || got.Title != "Old plan" {
		t.Errorf("deleted note for its owner = %+v, %v", got, err)
	}
	if got, err := r.GetNoteDetails(ctx, reader, note, withDeleted); err != nil || got != nil {
		t.Errorf("deleted note for a share recipient = %+v, %v", got, err)
	}

	if _, err := r.RestoreDeletedNote(ctx, owner, note); err != nil {
		t.Fatal(err)
	}
	if got, err := r.GetNoteDetails(ctx, reader, note, withDeleted); err != nil || got == nil || got.IsDeleted {
		t.Errorf("restored note for a share recipient = %+v, %v", got, err)
	}
}
