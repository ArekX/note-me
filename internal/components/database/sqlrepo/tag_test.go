package sqlrepo

import (
	"context"
	"errors"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func TestNormalizeTags(t *testing.T) {
	got := normalizeTags([]string{" Work ", "work", "two words", "", "  ", "Ünï"})
	if want := []string{"work", "twowords", "ünï"}; !slices.Equal(got, want) {
		t.Errorf("normalizeTags = %v, want %v", got, want)
	}
}

func noteTags(t *testing.T, r *Repository, userId int, noteId int64) []string {
	t.Helper()
	note, err := r.GetNote(context.Background(), userId, noteId)
	if err != nil {
		t.Fatal(err)
	}
	slices.Sort(note.Tags)
	return note.Tags
}

func TestLinkNoteWithTags(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	id := newTestNote(t, r, owner, "Plan", nil, "Work", "home")
	if got := noteTags(t, r, owner, id); !slices.Equal(got, []string{"home", "work"}) {
		t.Errorf("tags = %v", got)
	}

	if err := r.LinkNoteWithTags(ctx, owner, id, []string{"work", "later"}); err != nil {
		t.Fatal(err)
	}
	if got := noteTags(t, r, owner, id); !slices.Equal(got, []string{"later", "work"}) {
		t.Errorf("tags after change = %v", got)
	}

	otherNote := newTestNote(t, r, other, "Theirs", nil, "WORK")
	var tagCount int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_tag" WHERE "name" = 'work'`).Scan(&tagCount); err != nil || tagCount != 1 {
		t.Errorf("work tag rows = %d, %v", tagCount, err)
	}
	if got := noteTags(t, r, other, otherNote); !slices.Equal(got, []string{"work"}) {
		t.Errorf("other user tags = %v", got)
	}

	if err := r.LinkNoteWithTags(ctx, owner, id, []string{}); err != nil {
		t.Fatal(err)
	}
	if got := noteTags(t, r, owner, id); len(got) != 0 {
		t.Errorf("tags after clear = %v", got)
	}
}

func TestFindTags(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")

	for _, name := range []string{"work", "homework", "home", "100%", "1000"} {
		if _, err := r.CreateTagRecord(ctx, owner, name); err != nil {
			t.Fatal(err)
		}
	}

	names := func(name string, page int) []string {
		t.Helper()
		records, err := r.FindTags(ctx, name, page)
		if err != nil {
			t.Fatal(err)
		}
		result := []string{}
		for _, record := range records.Results {
			result = append(result, record.Name)
		}
		slices.Sort(result)
		return result
	}

	if got := names("work", 1); !slices.Equal(got, []string{"homework", "work"}) {
		t.Errorf("work = %v", got)
	}
	if got := names("0%", 1); !slices.Equal(got, []string{"100%"}) {
		t.Errorf("escaped = %v", got)
	}
	if got := names("", 1); len(got) != 5 {
		t.Errorf("all = %v", got)
	}

	for index := range 25 {
		if _, err := r.CreateTagRecord(ctx, owner, "tag"+string(rune('a'+index))); err != nil {
			t.Fatal(err)
		}
	}
	records, err := r.FindTags(ctx, "", 2)
	if err != nil {
		t.Fatal(err)
	}
	if records.Total != 30 || len(records.Results) != 10 || records.PerPage != 20 {
		t.Errorf("page 2 = total %d, %d results", records.Total, len(records.Results))
	}
}

func TestUpdateAndDeleteTagRecord(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	id := newTestNote(t, r, owner, "Plan", nil, "work", "home")

	tags, err := r.FindTags(ctx, "work", 1)
	if err != nil || len(tags.Results) != 1 {
		t.Fatalf("find = %+v, %v", tags, err)
	}
	work := tags.Results[0].Id

	if err := r.UpdateTagRecord(ctx, work, "job"); err != nil {
		t.Fatal(err)
	}
	if got := noteTags(t, r, owner, id); !slices.Equal(got, []string{"home", "job"}) {
		t.Errorf("tags after rename = %v", got)
	}

	if err := r.DeleteTagRecord(ctx, work); err != nil {
		t.Fatal(err)
	}
	if got := noteTags(t, r, owner, id); !slices.Equal(got, []string{"home"}) {
		t.Errorf("tags after delete = %v", got)
	}
	var links int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_tag_note" WHERE "tag_id" = ?`, work).Scan(&links); err != nil || links != 0 {
		t.Errorf("links left = %d, %v", links, err)
	}
}

func TestTagNamesAreUnique(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")

	work, err := r.CreateTagRecord(ctx, owner, "work")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateTagRecord(ctx, owner, "work"); !errors.Is(err, repository.ErrTagExists) {
		t.Errorf("duplicate create = %v", err)
	}
	home, err := r.CreateTagRecord(ctx, owner, "home")
	if err != nil {
		t.Fatal(err)
	}
	if err := r.UpdateTagRecord(ctx, home.Id, "work"); !errors.Is(err, repository.ErrTagExists) {
		t.Errorf("rename to taken name = %v", err)
	}
	if err := r.UpdateTagRecord(ctx, work.Id, "work"); err != nil {
		t.Errorf("rename to own name = %v", err)
	}

	record, err := r.GetTagRecord(ctx, work.Id)
	if err != nil || record == nil || record.Name != "work" {
		t.Errorf("GetTagRecord = %+v, %v", record, err)
	}
	if record, err := r.GetTagRecord(ctx, 999); err != nil || record != nil {
		t.Errorf("missing tag = %+v, %v", record, err)
	}

	resolved, err := r.ResolveTags(ctx, owner, []string{"work", "new"})
	if err != nil || len(resolved) != 2 || resolved[0].Id != work.Id {
		t.Errorf("resolve = %+v, %v", resolved, err)
	}
	var count int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_tag"`).Scan(&count); err != nil || count != 3 {
		t.Errorf("tag rows = %d, %v", count, err)
	}
}
