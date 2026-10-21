package sqlrepo

import (
	"context"
	"errors"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func createTestUser(t *testing.T, r *Repository, username string) int {
	t.Helper()
	insertUser(t, r, username)
	var id int
	if err := r.q.QueryRowContext(context.Background(), `SELECT "id" FROM "user" WHERE "username" = ?`, username).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func createTestGroup(t *testing.T, r *Repository, userId int, name string, parentId *int64) int64 {
	t.Helper()
	record, err := r.CreateGroup(context.Background(), repository.NewGroupRecord{Name: name, ParentId: parentId, UserId: userId})
	if err != nil {
		t.Fatal(err)
	}
	return record.Id
}

func createTestNote(t *testing.T, r *Repository, userId int, title string, groupId *int64) int64 {
	t.Helper()
	ctx := context.Background()
	id, err := r.insert(
		ctx,
		`INSERT INTO "note" ("title", "note", "user_id", "created_at", "updated_at") VALUES (?, '', ?, ?, ?)`,
		title, userId, now(), now(),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := r.q.ExecContext(ctx, `INSERT INTO "group_note" ("group_id", "note_id", "user_id") VALUES (?, ?, ?)`, groupId, id, userId); err != nil {
		t.Fatal(err)
	}
	return id
}

func treeNames(t *testing.T, r *Repository, userId int, groupId *int64, itemType string) []string {
	t.Helper()
	records, err := r.GetTreeList(context.Background(), userId, groupId, itemType)
	if err != nil {
		t.Fatal(err)
	}
	names := []string{}
	for _, record := range records {
		names = append(names, record.Name)
	}
	return names
}

func TestGroupOwnership(t *testing.T) {
	ctx := context.Background()
	r := openTestRepository(t)
	alice := createTestUser(t, r, "alice")
	bob := createTestUser(t, r, "bob")

	group := createTestGroup(t, r, alice, "Work", nil)

	if record, err := r.GetGroupById(ctx, bob, group); err != nil || record != nil {
		t.Errorf("bob GetGroupById = %+v, %v", record, err)
	}
	if _, err := r.CreateGroup(ctx, repository.NewGroupRecord{Name: "x", ParentId: &group, UserId: bob}); !errors.Is(err, repository.ErrGroupNotFound) {
		t.Errorf("create under another user's group: %v", err)
	}
	name := "Hijacked"
	if err := r.UpdateGroup(ctx, bob, group, repository.GroupUpdate{Name: &name}); !errors.Is(err, repository.ErrGroupNotFound) {
		t.Errorf("update another user's group: %v", err)
	}
	if got := treeNames(t, r, bob, nil, ""); len(got) != 0 {
		t.Errorf("bob tree = %v", got)
	}

	record, err := r.GetGroupById(ctx, alice, group)
	if err != nil || record == nil || record.Name != "Work" || record.HasSubgroups != nil || record.HasNotes != nil {
		t.Errorf("alice GetGroupById = %+v, %v", record, err)
	}
}

func TestUpdateGroupParent(t *testing.T) {
	ctx := context.Background()
	r := openTestRepository(t)
	user := createTestUser(t, r, "alice")

	a := createTestGroup(t, r, user, "A", nil)
	b := createTestGroup(t, r, user, "B", &a)
	c := createTestGroup(t, r, user, "C", &b)
	d := createTestGroup(t, r, user, "D", nil)

	tests := []struct {
		group  int64
		parent int64
		want   error
	}{
		{a, a, repository.ErrGroupOwnParent},
		{a, b, repository.ErrGroupIntoDescendant},
		{a, c, repository.ErrGroupIntoDescendant},
		{a, 999, repository.ErrGroupNotFound},
		{c, d, nil},
	}
	for _, tt := range tests {
		err := r.UpdateGroup(ctx, user, tt.group, repository.GroupUpdate{SetParent: true, ParentId: &tt.parent})
		if !errors.Is(err, tt.want) {
			t.Errorf("move %d into %d: err = %v, want %v", tt.group, tt.parent, err, tt.want)
		}
	}

	if err := r.UpdateGroup(ctx, user, b, repository.GroupUpdate{SetParent: true}); err != nil {
		t.Fatal(err)
	}
	if got := treeNames(t, r, user, nil, repository.TreeItemGroup); !slices.Equal(got, []string{"A", "B", "D"}) {
		t.Errorf("top level = %v", got)
	}
	if got := treeNames(t, r, user, &d, ""); !slices.Equal(got, []string{"C"}) {
		t.Errorf("D children = %v", got)
	}

	name := "Renamed"
	if err := r.UpdateGroup(ctx, user, a, repository.GroupUpdate{Name: &name}); err != nil {
		t.Fatal(err)
	}
	record, err := r.GetGroupById(ctx, user, a)
	if err != nil || record.Name != "Renamed" || record.ParentId != nil {
		t.Errorf("renamed group = %+v, %v", record, err)
	}
}

func TestGetTreeList(t *testing.T) {
	r := openTestRepository(t)
	user := createTestUser(t, r, "alice")
	other := createTestUser(t, r, "bob")

	createTestNote(t, r, user, "Root note", nil)
	empty := createTestGroup(t, r, user, "Empty", nil)
	withNote := createTestGroup(t, r, user, "With note", nil)
	withDeletedNote := createTestGroup(t, r, user, "With deleted note", nil)
	withDeletedGroup := createTestGroup(t, r, user, "With deleted group", nil)
	createTestNote(t, r, user, "Inner note", &withNote)
	deletedNote := createTestNote(t, r, user, "Deleted note", &withDeletedNote)
	deletedGroup := createTestGroup(t, r, user, "Deleted", &withDeletedGroup)
	createTestNote(t, r, other, "Other user's note", nil)

	ctx := context.Background()
	if _, err := r.q.ExecContext(ctx, `UPDATE "note" SET "is_deleted" = true WHERE "id" = ?`, deletedNote); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteGroup(ctx, user, deletedGroup); err != nil {
		t.Fatal(err)
	}

	records, err := r.GetTreeList(ctx, user, nil, "")
	if err != nil {
		t.Fatal(err)
	}
	want := []repository.TreeRecord{
		{Type: repository.TreeItemGroup, Id: empty, Name: "Empty", IsEncrypted: 0, HasChildren: 0},
		{Type: repository.TreeItemGroup, Id: withNote, Name: "With note", IsEncrypted: 0, HasChildren: 1},
		{Type: repository.TreeItemGroup, Id: withDeletedNote, Name: "With deleted note", IsEncrypted: 0, HasChildren: 0},
		{Type: repository.TreeItemGroup, Id: withDeletedGroup, Name: "With deleted group", IsEncrypted: 0, HasChildren: 1},
		{Type: repository.TreeItemNote, Id: 1, Name: "Root note", IsEncrypted: 0, HasChildren: 0},
	}
	if !slices.Equal(records, want) {
		t.Errorf("top level\n got  %+v\n want %+v", records, want)
	}

	if got := treeNames(t, r, user, nil, repository.TreeItemNote); !slices.Equal(got, []string{"Root note"}) {
		t.Errorf("notes only = %v", got)
	}
	if got := treeNames(t, r, user, &withDeletedGroup, ""); len(got) != 0 {
		t.Errorf("children of group with deleted subgroup = %v", got)
	}

	groups, err := r.GetTreeList(ctx, user, nil, repository.TreeItemGroup)
	if err != nil {
		t.Fatal(err)
	}
	for _, record := range groups {
		if record.Id == withNote && record.HasChildren != 0 {
			t.Errorf("group listing counts notes as children: %+v", record)
		}
	}
}

func TestDeleteGroupChildren(t *testing.T) {
	ctx := context.Background()
	r := openTestRepository(t)
	user := createTestUser(t, r, "alice")

	root := createTestGroup(t, r, user, "Root", nil)
	child := createTestGroup(t, r, user, "Child", &root)
	grandchild := createTestGroup(t, r, user, "Grandchild", &child)
	note := createTestNote(t, r, user, "Note", &root)
	createTestNote(t, r, user, "Deep note", &child)

	deleted, err := r.DeleteGroupChildren(ctx, user, root)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(deleted.GroupIds, []int64{child}) || !slices.Equal(deleted.NoteIds, []int64{note}) {
		t.Errorf("deleted = %+v", deleted)
	}

	var deletedAt *int64
	if err := r.q.QueryRowContext(ctx, `SELECT "deleted_at" FROM "note" WHERE "id" = ?`, note).Scan(&deletedAt); err != nil {
		t.Fatal(err)
	}
	if deletedAt == nil {
		t.Error("deleted note has no deleted_at")
	}

	if exists, _ := r.GroupExists(ctx, user, child); exists {
		t.Error("child group still exists")
	}
	if exists, _ := r.GroupExists(ctx, user, grandchild); !exists {
		t.Error("grandchild was deleted with the first level")
	}

	again, err := r.DeleteGroupChildren(ctx, user, root)
	if err != nil || len(again.GroupIds) != 0 || len(again.NoteIds) != 0 {
		t.Errorf("second delete = %+v, %v", again, err)
	}
}
