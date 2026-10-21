package sqlrepo

import (
	"context"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func searchTitles(t *testing.T, r *Repository, userId int, filters repository.SearchFilters) []string {
	t.Helper()
	records, err := r.SearchGeneral(context.Background(), userId, filters)
	if err != nil {
		t.Fatal(err)
	}
	titles := []string{}
	for _, record := range records {
		titles = append(titles, record.Title)
	}
	return titles
}

func TestSearchGeneralQuery(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	newTestNote(t, r, owner, "Shopping", nil)
	newTestNote(t, r, owner, "100% done", nil)
	newTestNote(t, r, owner, "a_b", nil)
	newTestNote(t, r, owner, "axb", nil)
	newTestNote(t, r, other, "Shopping too", nil)

	secret, err := r.CreateNote(ctx, repository.NewNoteRecord{Title: "Locked", Note: "shopping list", IsEncrypted: true, UserId: owner})
	if err != nil {
		t.Fatal(err)
	}
	if err := r.AssignNoteToGroup(ctx, owner, secret.Id, nil); err != nil {
		t.Fatal(err)
	}

	deleted := newTestNote(t, r, owner, "Old shopping", nil)
	if err := r.DeleteNote(ctx, owner, deleted); err != nil {
		t.Fatal(err)
	}

	tests := map[string][]string{
		"shop":    {"Shopping"},
		"text of": {"Shopping", "100% done", "a_b", "axb"},
		"%":       {"100% done"},
		"_":       {"a_b"},
		"locked":  {"Locked"},
	}
	for query, want := range tests {
		if got := searchTitles(t, r, owner, repository.SearchFilters{Query: query}); !slices.Equal(got, want) {
			t.Errorf("query %q = %v, want %v", query, got, want)
		}
	}

	records, err := r.SearchGeneral(ctx, owner, repository.SearchFilters{Query: "Shopping"})
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || records[0].Note != "text of Shopping" || records[0].UserName != "owner" || records[0].GroupName != nil || records[0].IsEncrypted {
		t.Errorf("record = %+v", records)
	}
}

func TestSearchGeneralGroupAndTags(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	work := createTestGroup(t, r, owner, "Work", nil)
	project := createTestGroup(t, r, owner, "Project", &work)
	archive := createTestGroup(t, r, owner, "Archive", &project)
	home := createTestGroup(t, r, owner, "Home", nil)
	theirs := createTestGroup(t, r, other, "Theirs", nil)

	newTestNote(t, r, owner, "Top", &work, "todo")
	newTestNote(t, r, owner, "Nested", &project, "idea")
	newTestNote(t, r, owner, "Archived", &archive, "todo", "idea")
	newTestNote(t, r, owner, "House", &home, "todo")
	newTestNote(t, r, owner, "Loose", nil)
	newTestNote(t, r, other, "Foreign", &theirs, "todo")

	if err := r.DeleteGroup(ctx, owner, project); err != nil {
		t.Fatal(err)
	}

	if got := searchTitles(t, r, owner, repository.SearchFilters{GroupId: &work}); !slices.Equal(got, []string{"Top", "Nested", "Archived"}) {
		t.Errorf("group walk = %v", got)
	}
	if got := searchTitles(t, r, owner, repository.SearchFilters{GroupId: &theirs}); len(got) != 0 {
		t.Errorf("foreign group = %v", got)
	}
	if got := searchTitles(t, r, owner, repository.SearchFilters{Tags: []string{"idea", "missing"}}); !slices.Equal(got, []string{"Nested", "Archived"}) {
		t.Errorf("tags any-of = %v", got)
	}
	if got := searchTitles(t, r, owner, repository.SearchFilters{GroupId: &work, Tags: []string{"todo"}, Query: "o"}); !slices.Equal(got, []string{"Top", "Archived"}) {
		t.Errorf("combined = %v", got)
	}

	records, err := r.SearchGeneral(ctx, owner, repository.SearchFilters{Query: "Top"})
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || records[0].GroupName == nil || *records[0].GroupName != "Work" {
		t.Errorf("group name = %+v", records)
	}
}

func TestSearchGeneralKeysetPaging(t *testing.T) {
	r := openTestRepository(t)
	owner := createTestUser(t, r, "owner")

	for range 25 {
		newTestNote(t, r, owner, "Note", nil)
	}

	var pages [][]repository.NoteSearchRecord
	var fromId *int64
	for {
		records, err := r.SearchGeneral(context.Background(), owner, repository.SearchFilters{Query: "note", FromId: fromId})
		if err != nil {
			t.Fatal(err)
		}
		pages = append(pages, records)
		if len(records) < searchPageSize {
			break
		}
		fromId = &records[len(records)-1].Id
	}

	if len(pages) != 3 || len(pages[0]) != 10 || len(pages[1]) != 10 || len(pages[2]) != 5 {
		t.Fatalf("page sizes = %d pages", len(pages))
	}
	if pages[1][0].Id != 11 || pages[2][4].Id != 25 {
		t.Errorf("page boundaries = %d, %d", pages[1][0].Id, pages[2][4].Id)
	}
}
