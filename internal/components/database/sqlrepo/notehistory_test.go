package sqlrepo

import (
	"context"
	"errors"
	"testing"

	"noteme/internal/components/repository"
)

func TestNoteHistory(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	id := newTestNote(t, r, owner, "Plan", nil, "b", "a")

	if err := r.AddHistory(ctx, owner, id, false); err != nil {
		t.Fatal(err)
	}
	title := "Plan v2"
	if err := r.UpdateNote(ctx, owner, id, repository.NoteUpdate{Title: &title}); err != nil {
		t.Fatal(err)
	}
	if err := r.AddHistory(ctx, owner, id, true); err != nil {
		t.Fatal(err)
	}
	if err := r.AddHistory(ctx, other, id, false); !errors.Is(err, repository.ErrNoteNotFound) {
		t.Errorf("foreign snapshot error = %v", err)
	}

	page, err := r.FindHistory(ctx, owner, id, 1)
	if err != nil {
		t.Fatal(err)
	}
	if page.Total != 2 || page.Results[0].Version != "Version 2 (before reversal)" || page.Results[1].Version != "Version 1" {
		t.Fatalf("history = %+v", page)
	}
	if page, _ := r.FindHistory(ctx, other, id, 1); page.Total != 0 {
		t.Errorf("other user sees %d versions", page.Total)
	}

	first, err := r.GetHistoryRecordData(ctx, owner, page.Results[1].Id)
	if err != nil || first.Title != "Plan" || first.Note != "text of Plan" || first.NoteId != id || (first.Tags != "a,b" && first.Tags != "b,a") {
		t.Errorf("first version = %+v, %v", first, err)
	}
	if data, _ := r.GetHistoryRecordData(ctx, other, page.Results[1].Id); data != nil {
		t.Errorf("other user got %+v", data)
	}

	if err := r.DeleteHistoryRecord(ctx, id+1, page.Results[0].Id); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteHistoryRecord(ctx, id, page.Results[1].Id); err != nil {
		t.Fatal(err)
	}
	if page, _ := r.FindHistory(ctx, owner, id, 1); page.Total != 1 || page.Results[0].Version != "Version 2 (before reversal)" {
		t.Errorf("after delete = %+v", page)
	}
}
