package sqlrepo

import (
	"context"
	"fmt"
	"slices"
	"testing"

	"noteme/internal/components/repository"
	"noteme/internal/encryption"
)

func TestUserManagement(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()

	alice, err := r.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Alice Smith", Username: "alice", Password: "password1", Role: "admin", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	bob, err := r.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Bob 100%", Username: "bob_b", Password: "password1", Role: "user", Timezone: "Europe/Belgrade"})
	if err != nil {
		t.Fatal(err)
	}

	for name, c := range map[string]struct {
		filters repository.UserFilters
		want    []int
	}{
		"all":           {repository.UserFilters{}, []int{alice, bob}},
		"name":          {repository.UserFilters{Name: "smi"}, []int{alice}},
		"escaped name":  {repository.UserFilters{Name: "100%"}, []int{bob}},
		"escaped user":  {repository.UserFilters{Username: "_b"}, []int{bob}},
		"role":          {repository.UserFilters{Role: "user"}, []int{bob}},
		"role and name": {repository.UserFilters{Role: "user", Name: "alice"}, nil},
		"partial role":  {repository.UserFilters{Role: "adm"}, nil},
	} {
		page, err := r.FindUsers(ctx, c.filters, 1)
		if err != nil {
			t.Fatal(err)
		}
		var got []int
		for _, record := range page.Results {
			got = append(got, record.Id)
		}
		if len(got) != len(c.want) || (len(got) > 0 && got[0] != c.want[0]) {
			t.Errorf("%s: users = %v, want %v", name, got, c.want)
		}
	}

	if id, _ := r.GetUserIdByUsername(ctx, "bob_b"); id != bob {
		t.Errorf("GetUserIdByUsername = %d, want %d", id, bob)
	}
	if admins, _ := r.CountUsersWithRole(ctx, "admin"); admins != 1 {
		t.Errorf("admins = %d, want 1", admins)
	}

	if updated, err := r.UpdateUserRecord(ctx, bob, repository.UserUpdate{Name: "Robert", Role: "admin", Timezone: "UTC"}); err != nil || !updated {
		t.Fatalf("update = %v, %v", updated, err)
	}
	record, _ := r.GetUserById(ctx, bob)
	if record.Name != "Robert" || record.Role != "admin" || record.Timezone != "UTC" {
		t.Errorf("updated user = %+v", record)
	}
	if ok, _ := r.ValidateUserPassword(ctx, bob, "password1"); !ok {
		t.Error("update without password changed the password")
	}

	if _, err := r.q.ExecContext(ctx, `UPDATE "user" SET "is_password_reset_required" = false WHERE "id" = ?`, bob); err != nil {
		t.Fatal(err)
	}
	if _, err := r.UpdateUserRecord(ctx, bob, repository.UserUpdate{Name: "Robert", Role: "admin", Timezone: "UTC", NewPassword: "newpassword"}); err != nil {
		t.Fatal(err)
	}
	if ok, _ := r.ValidateUserPassword(ctx, bob, "newpassword"); !ok {
		t.Error("new password not set")
	}
	key, _ := r.GetNoteEncryptionKey(ctx, bob)
	if _, err := encryption.OpenNoteKey(key, "newpassword"); err != nil {
		t.Errorf("note key does not open with the new password: %v", err)
	}
	if record, _ := r.GetUserById(ctx, bob); !record.IsPasswordResetRequired {
		t.Error("new password does not require a reset")
	}

	if deleted, err := r.DeleteUserRecord(ctx, bob, alice); err != nil || deleted == nil {
		t.Fatalf("delete = %+v, %v", deleted, err)
	}
	if deleted, err := r.DeleteUserRecord(ctx, bob, alice); err != nil || deleted != nil {
		t.Errorf("deleted twice = %+v, %v", deleted, err)
	}
	if updated, _ := r.UpdateUserRecord(ctx, bob, repository.UserUpdate{Name: "X", Role: "user", Timezone: "UTC"}); updated {
		t.Error("updated a deleted user")
	}
	if page, _ := r.FindUsers(ctx, repository.UserFilters{}, 1); page.Total != 1 {
		t.Errorf("users after delete = %d", page.Total)
	}
	if id, _ := r.GetUserIdByUsername(ctx, "bob_b"); id != 0 {
		t.Errorf("deleted user by username = %d", id)
	}
}

func TestDeleteUserRemovesEverything(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	admin := createTestUser(t, r, "admin")
	gone := createTestUser(t, r, "gone")
	other := createTestUser(t, r, "other")

	group, err := r.CreateGroup(ctx, repository.NewGroupRecord{Name: "Work", UserId: gone})
	if err != nil {
		t.Fatal(err)
	}
	child, err := r.CreateGroup(ctx, repository.NewGroupRecord{Name: "Child", ParentId: &group.Id, UserId: gone})
	if err != nil {
		t.Fatal(err)
	}
	own := newTestNote(t, r, gone, "Mine", &child.Id)
	theirs := newTestNote(t, r, other, "Theirs", nil)
	if err := r.LinkNoteWithTags(ctx, gone, own, []string{"shared-tag", "lonely-tag"}); err != nil {
		t.Fatal(err)
	}
	if err := r.LinkNoteWithTags(ctx, other, theirs, []string{"shared-tag"}); err != nil {
		t.Fatal(err)
	}
	if err := r.AddHistory(ctx, gone, own, false); err != nil {
		t.Fatal(err)
	}
	if _, err := r.SetUserShare(ctx, gone, own, []int64{int64(other)}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.SetUserShare(ctx, other, theirs, []int64{int64(gone)}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreatePublicShare(ctx, own, nil); err != nil {
		t.Fatal(err)
	}
	for _, reminder := range [][2]int64{{int64(gone), own}, {int64(gone), theirs}, {int64(other), own}} {
		if _, err := r.SetReminder(ctx, int(reminder[0]), reminder[1], repository.Reminder{Once: true, NextAt: 60}); err != nil {
			t.Fatal(err)
		}
	}
	if err := r.CreateFileRecord(ctx, repository.NewFileRecord{Identifier: "file-a", Name: "a.png", UserId: gone, MimeType: "image/png", Size: 1}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNotification(ctx, gone, `{"type":"reminder-received","payload":{"id":1}}`); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNotification(ctx, other, `{"type":"note-shared","payload":{"id":`+fmt.Sprint(own)+`}}`); err != nil {
		t.Fatal(err)
	}
	if _, err := r.CreateNewSession(ctx, repository.NewSessionRecord{Key: "s", UserId: gone, ExpiresAt: 1 << 60, Data: []byte("{}")}); err != nil {
		t.Fatal(err)
	}
	createTestPasskey(t, r, gone, "cred", "Phone")
	mcpClient := newTestMCPClient(t, r, repository.NewMCPClient{UserId: gone, Name: "Claude", Kind: repository.MCPClientToken})
	newTestMCPToken(t, r, repository.NewMCPToken{ClientId: mcpClient.Id, Kind: repository.MCPTokenPersonal, TokenHash: "hash", TokenPrefix: "nmcp_"})

	deleted, err := r.DeleteUserRecord(ctx, gone, admin)
	if err != nil || deleted == nil || !slices.Equal(deleted.FileIdentifiers, []string{"file-a"}) {
		t.Fatalf("delete = %+v, %v", deleted, err)
	}

	for table, query := range map[string]string{
		"user":            `SELECT COUNT(*) FROM "user" WHERE "id" = ?`,
		"note":            `SELECT COUNT(*) FROM "note" WHERE "user_id" = ?`,
		"group":           `SELECT COUNT(*) FROM "group" WHERE "user_id" = ?`,
		"group_note":      `SELECT COUNT(*) FROM "group_note" WHERE "user_id" = ?`,
		"note_reminder":   `SELECT COUNT(*) FROM "note_reminder" WHERE "user_id" = ?`,
		"note_share_user": `SELECT COUNT(*) FROM "note_share_user" WHERE "user_id" = ?`,
		"file":            `SELECT COUNT(*) FROM "file" WHERE "user_id" = ?`,
		"notification":    `SELECT COUNT(*) FROM "notification" WHERE "user_id" = ?`,
		"session":         `SELECT COUNT(*) FROM "session" WHERE "user_id" = ?`,
		"user_passkey":    `SELECT COUNT(*) FROM "user_passkey" WHERE "user_id" = ?`,
		"note_tag":        `SELECT COUNT(*) FROM "note_tag" WHERE "user_id" = ?`,
		"mcp_client":      `SELECT COUNT(*) FROM "mcp_client" WHERE "user_id" = ?`,
	} {
		var count int
		if err := r.q.QueryRowContext(ctx, query, gone).Scan(&count); err != nil || count != 0 {
			t.Errorf("%s rows left = %d, %v", table, count, err)
		}
	}
	for table, query := range map[string]string{
		"note_history":    `SELECT COUNT(*) FROM "note_history" WHERE "note_id" = ?`,
		"note_share_link": `SELECT COUNT(*) FROM "note_share_link" WHERE "note_id" = ?`,
		"note_share_user": `SELECT COUNT(*) FROM "note_share_user" WHERE "note_id" = ?`,
		"note_reminder":   `SELECT COUNT(*) FROM "note_reminder" WHERE "note_id" = ?`,
		"note_tag_note":   `SELECT COUNT(*) FROM "note_tag_note" WHERE "note_id" = ?`,
	} {
		var count int
		if err := r.q.QueryRowContext(ctx, query, own).Scan(&count); err != nil || count != 0 {
			t.Errorf("%s rows of the deleted note left = %d, %v", table, count, err)
		}
	}
	if countMCPTokens(t, r, mcpClient.Id) != 0 {
		t.Error("mcp_token rows of the deleted user left")
	}
	if notifications, _ := r.GetUserNotifications(ctx, other); len(notifications) != 0 {
		t.Errorf("notifications about the deleted note left = %+v", notifications)
	}

	tags, err := r.ResolveTags(ctx, other, []string{"shared-tag", "lonely-tag"})
	if err != nil {
		t.Fatal(err)
	}
	var owner int
	if err := r.q.QueryRowContext(ctx, `SELECT "user_id" FROM "note_tag" WHERE "name" = 'shared-tag'`).Scan(&owner); err != nil || owner != admin {
		t.Errorf("shared tag owner = %d, %v, want %d", owner, err, admin)
	}
	var lonely int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_tag" WHERE "name" = 'lonely-tag' AND "id" != ?`, tags[1].Id).Scan(&lonely); err != nil || lonely != 0 {
		t.Errorf("unused tag survived: %d, %v", lonely, err)
	}
	if theirs, _ := r.GetNote(ctx, other, theirs); theirs == nil {
		t.Error("another user's note was removed")
	}
}
