package sqlrepo

import (
	"context"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func TestSetUserShare(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	first := createTestUser(t, r, "first")
	second := createTestUser(t, r, "second")
	note := newTestNote(t, r, owner, "Plan", nil)

	added, err := r.SetUserShare(ctx, owner, note, []int64{int64(first), int64(owner), 999})
	if err != nil || !slices.Equal(added, []int64{int64(first)}) {
		t.Fatalf("first share = %v, %v", added, err)
	}

	added, err = r.SetUserShare(ctx, owner, note, []int64{int64(first), int64(second)})
	if err != nil || !slices.Equal(added, []int64{int64(second)}) {
		t.Errorf("second share = %v, %v", added, err)
	}

	added, err = r.SetUserShare(ctx, owner, note, []int64{int64(second)})
	if err != nil || len(added) != 0 {
		t.Errorf("removal = %v, %v", added, err)
	}
	data, err := r.GetNoteShareData(ctx, note)
	if err != nil || len(data.Users) != 1 || data.Users[0].Username != "second" {
		t.Errorf("share data = %+v, %v", data, err)
	}
	if shared, _ := r.SharedNoteWithUser(ctx, first, note); shared {
		t.Error("removed user still has the note")
	}
	if shared, _ := r.SharedNoteWithUser(ctx, second, note); !shared {
		t.Error("shared user lost the note")
	}
}

func TestFindNoteShareUserIds(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	first := createTestUser(t, r, "first")
	second := createTestUser(t, r, "second")
	plan := newTestNote(t, r, owner, "Plan", nil)
	ideas := newTestNote(t, r, owner, "Ideas", nil)
	private := newTestNote(t, r, owner, "Private", nil)

	if _, err := r.SetUserShare(ctx, owner, plan, []int64{int64(second), int64(first)}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.SetUserShare(ctx, owner, ideas, []int64{int64(first)}); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteNote(ctx, owner, ideas); err != nil {
		t.Fatal(err)
	}

	ids, err := r.FindNoteShareUserIds(ctx, []int64{plan, ideas, private})
	if err != nil || !slices.Equal(ids, []int{first, second}) {
		t.Errorf("recipients = %v, %v", ids, err)
	}
	if ids, err := r.FindNoteShareUserIds(ctx, []int64{ideas}); err != nil || !slices.Equal(ids, []int{first}) {
		t.Errorf("recipients of a deleted note = %v, %v", ids, err)
	}
	if ids, err := r.FindNoteShareUserIds(ctx, []int64{private}); err != nil || len(ids) != 0 {
		t.Errorf("recipients of an unshared note = %v, %v", ids, err)
	}
	if ids, err := r.FindNoteShareUserIds(ctx, nil); err != nil || len(ids) != 0 {
		t.Errorf("recipients of no notes = %v, %v", ids, err)
	}
}

func TestPublicShares(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	note := newTestNote(t, r, owner, "Plan", nil, "work")

	forever, err := r.CreatePublicShare(ctx, note, nil)
	if err != nil {
		t.Fatal(err)
	}
	past := now() - 10
	expired, err := r.CreatePublicShare(ctx, note, &past)
	if err != nil {
		t.Fatal(err)
	}
	if forever.Identifier == expired.Identifier || len(forever.Identifier) != 36 {
		t.Errorf("identifiers = %q, %q", forever.Identifier, expired.Identifier)
	}

	shared, err := r.GetPublicShareNote(ctx, forever.Identifier)
	if err != nil || shared == nil || shared.Title != "Plan" || shared.UserName != "owner" || !slices.Equal(shared.Tags, []string{"work"}) {
		t.Fatalf("public note = %+v, %v", shared, err)
	}
	if shared, _ := r.GetPublicShareNote(ctx, expired.Identifier); shared != nil {
		t.Errorf("expired link returned %+v", shared)
	}

	data, _ := r.GetNoteShareData(ctx, note)
	if len(data.Links) != 2 || data.Links[0].Id != expired.Id {
		t.Errorf("links = %+v", data.Links)
	}

	removed, err := r.RemoveExpiredPublicShares(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if want := []repository.ExpiredPublicShare{{NoteId: note, OwnerId: owner}}; !slices.Equal(removed, want) {
		t.Errorf("expired shares = %+v, want %+v", removed, want)
	}
	if removed, err := r.RemoveExpiredPublicShares(ctx); err != nil || len(removed) != 0 {
		t.Errorf("second cleanup = %+v, %v", removed, err)
	}
	if data, _ := r.GetNoteShareData(ctx, note); len(data.Links) != 1 || data.Links[0].Id != forever.Id {
		t.Errorf("links after expiry cleanup = %+v", data.Links)
	}

	if err := r.DeleteNote(ctx, owner, note); err != nil {
		t.Fatal(err)
	}
	if shared, _ := r.GetPublicShareNote(ctx, forever.Identifier); shared != nil {
		t.Errorf("deleted note shared: %+v", shared)
	}

	if err := r.RemovePublicShare(ctx, note, forever.Id); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetNoteShareData(ctx, note); len(data.Links) != 0 {
		t.Errorf("links after remove = %+v", data.Links)
	}
}

func TestFindAndSearchSharedNotes(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	other := createTestUser(t, r, "other")

	var notes []int64
	for range 12 {
		id := newTestNote(t, r, owner, "Shared plan", nil)
		if _, err := r.SetUserShare(ctx, owner, id, []int64{int64(reader)}); err != nil {
			t.Fatal(err)
		}
		notes = append(notes, id)
	}
	if _, err := r.SetUserShare(ctx, owner, notes[0], []int64{int64(reader), int64(other)}); err != nil {
		t.Fatal(err)
	}

	page, err := r.FindUserSharedNotes(ctx, reader, repository.SharedNotesFilters{Limit: 50})
	if err != nil || len(page) != 10 || page[0].Id != notes[11] || page[0].UserName != "owner" {
		t.Fatalf("first page = %+v, %v", page, err)
	}
	last := page[9]
	rest, err := r.FindUserSharedNotes(ctx, reader, repository.SharedNotesFilters{FromCreatedAt: &last.CreatedAt, FromShareId: &last.ShareId})
	if err != nil || len(rest) != 2 || rest[1].Id != notes[0] {
		t.Errorf("second page = %+v, %v", rest, err)
	}

	user, err := r.GetUserShareNote(ctx, reader, notes[0])
	if err != nil || user == nil || user.Title != "Shared plan" {
		t.Errorf("user share note = %+v, %v", user, err)
	}
	if user, _ := r.GetUserShareNote(ctx, owner, notes[0]); user != nil {
		t.Errorf("owner got a share record: %+v", user)
	}

	results, err := r.SearchSharedNotes(ctx, other, repository.SearchFilters{Query: "plan"})
	if err != nil || len(results) != 1 || results[0].Id != notes[0] {
		t.Errorf("other user search = %+v, %v", results, err)
	}
	if results, _ := r.SearchSharedNotes(ctx, reader, repository.SearchFilters{Query: "plan"}); len(results) != 10 {
		t.Errorf("reader search = %d", len(results))
	}
}

func TestFindPickerUsers(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	var ids []int64
	for _, name := range []string{"anna", "annabel", "annie", "anton", "andrew", "anders", "bob"} {
		ids = append(ids, int64(createTestUser(t, r, name)))
	}

	page, err := r.FindPickerUsers(ctx, repository.PickUserFilters{Name: "an"}, 1)
	if err != nil || page.Total != 6 || len(page.Results) != 5 || page.PerPage != 5 {
		t.Fatalf("page = %+v, %v", page, err)
	}
	page, _ = r.FindPickerUsers(ctx, repository.PickUserFilters{Name: "an", ExcludeUserIds: ids[:2]}, 1)
	if page.Total != 4 {
		t.Errorf("excluded total = %d", page.Total)
	}
	page, _ = r.FindPickerUsers(ctx, repository.PickUserFilters{Username: "ann", UserIds: []int64{ids[0], ids[6]}}, 1)
	if page.Total != 1 || page.Results[0].Name != "anna" {
		t.Errorf("user ids filter = %+v", page)
	}
}

func notificationIds(t *testing.T, r *Repository, userId int) []int64 {
	t.Helper()
	list, err := r.GetUserNotifications(context.Background(), userId)
	if err != nil {
		t.Fatal(err)
	}
	ids := []int64{}
	for _, record := range list {
		ids = append(ids, record.Id)
	}
	return ids
}

func TestSetUserShareRevokeRemovesReminderAndNotifications(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	note := newTestNote(t, r, owner, "Plan", nil)
	other := newTestNote(t, r, owner, "Other", nil)

	if _, err := r.SetUserShare(ctx, owner, note, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	setReminder(t, r, reader, note, repository.Reminder{Once: true, NextAt: now() + 3600})
	setReminder(t, r, owner, note, repository.Reminder{Once: true, NextAt: now() + 3600})
	readerOther, err := r.CreateNotification(ctx, reader, `{"type":"note-shared","payload":{"id":`+itoa(other)+`}}`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNotification(ctx, reader, `{"type":"note-shared","payload":{"id":`+itoa(note)+`}}`); err != nil {
		t.Fatal(err)
	}
	ownerNote, err := r.CreateNotification(ctx, owner, `{"type":"reminder-received","payload":{"id":`+itoa(note)+`}}`)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := r.SetUserShare(ctx, owner, note, nil); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetNoteReminderData(ctx, reader, note); data != nil {
		t.Errorf("revoked reader keeps reminder: %+v", data)
	}
	if data, _ := r.GetNoteReminderData(ctx, owner, note); data == nil {
		t.Error("owner lost the reminder")
	}
	if got := notificationIds(t, r, reader); !slices.Equal(got, []int64{readerOther.Id}) {
		t.Errorf("reader notifications = %v, want only %d", got, readerOther.Id)
	}
	if got := notificationIds(t, r, owner); !slices.Equal(got, []int64{ownerNote.Id}) {
		t.Errorf("owner notifications = %v", got)
	}
}

func TestRemoveNoteShares(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	reader := createTestUser(t, r, "reader")
	note := newTestNote(t, r, owner, "Plan", nil)

	if _, err := r.SetUserShare(ctx, owner, note, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreatePublicShare(ctx, note, nil); err != nil {
		t.Fatal(err)
	}
	setReminder(t, r, reader, note, repository.Reminder{Once: true, NextAt: now() + 3600})
	setReminder(t, r, owner, note, repository.Reminder{Once: true, NextAt: now() + 3600})
	if _, err := r.CreateNotification(ctx, reader, `{"type":"note-shared","payload":{"id":`+itoa(note)+`}}`); err != nil {
		t.Fatal(err)
	}
	ownerNote, err := r.CreateNotification(ctx, owner, `{"type":"reminder-received","payload":{"id":`+itoa(note)+`}}`)
	if err != nil {
		t.Fatal(err)
	}

	if err := r.RemoveNoteShares(ctx, note); err != nil {
		t.Fatal(err)
	}
	data, err := r.GetNoteShareData(ctx, note)
	if err != nil || len(data.Users) != 0 || len(data.Links) != 0 {
		t.Errorf("share data = %+v, %v", data, err)
	}
	if data, _ := r.GetNoteReminderData(ctx, reader, note); data != nil {
		t.Errorf("reader keeps reminder: %+v", data)
	}
	if data, _ := r.GetNoteReminderData(ctx, owner, note); data == nil {
		t.Error("owner lost the reminder")
	}
	if got := notificationIds(t, r, reader); len(got) != 0 {
		t.Errorf("reader notifications = %v", got)
	}
	if got := notificationIds(t, r, owner); !slices.Equal(got, []int64{ownerNote.Id}) {
		t.Errorf("owner notifications = %v", got)
	}
}
