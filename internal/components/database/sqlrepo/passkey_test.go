package sqlrepo

import (
	"context"
	"testing"

	"noteme/internal/components/repository"
)

func createTestPasskey(t *testing.T, r *Repository, userId int, credentialId, name string) {
	t.Helper()
	created, err := r.CreatePasskey(context.Background(), repository.NewPasskeyRecord{
		PasskeyCredential: repository.PasskeyCredential{
			CredentialId:     credentialId,
			PublicKey:        []byte{1, 2, 3},
			Counter:          4,
			IsBackupEligible: true,
			Transports:       "internal,hybrid",
		},
		UserId: userId,
		Name:   name,
	})
	if err != nil || !created {
		t.Fatalf("create passkey = %v, %v", created, err)
	}
}

func TestPasskeyUserHandle(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	user := createTestUser(t, r, "user")

	if handle, err := r.GetPasskeyUserHandle(ctx, user); err != nil || handle != "" {
		t.Fatalf("handle before registration = %q, %v", handle, err)
	}
	if err := r.SetPasskeyUserHandle(ctx, user, "first"); err != nil {
		t.Fatal(err)
	}
	if err := r.SetPasskeyUserHandle(ctx, user, "second"); err != nil {
		t.Fatal(err)
	}
	if handle, _ := r.GetPasskeyUserHandle(ctx, user); handle != "first" {
		t.Errorf("handle = %q, want the first one kept", handle)
	}
}

func TestPasskeyRecords(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	if err := r.SetPasskeyUserHandle(ctx, owner, "owner-handle"); err != nil {
		t.Fatal(err)
	}

	createTestPasskey(t, r, owner, "cred-a", "Phone")
	createTestPasskey(t, r, owner, "cred-b", "Key")
	createTestPasskey(t, r, other, "cred-c", "Theirs")

	created, err := r.CreatePasskey(ctx, repository.NewPasskeyRecord{PasskeyCredential: repository.PasskeyCredential{CredentialId: "cred-a", PublicKey: []byte{9}}, UserId: other, Name: "Copy"})
	if err != nil || created {
		t.Errorf("duplicate credential = %v, %v", created, err)
	}

	credentials, err := r.GetUserPasskeyCredentials(ctx, owner)
	if err != nil || len(credentials) != 2 || credentials[0].CredentialId != "cred-a" || !credentials[0].IsBackupEligible || credentials[0].Transports != "internal,hybrid" {
		t.Fatalf("credentials = %+v, %v", credentials, err)
	}

	login, err := r.GetPasskeyLogin(ctx, "cred-b")
	if err != nil || login == nil || login.UserId != owner || login.UserHandle != "owner-handle" || login.Counter != 4 {
		t.Fatalf("login = %+v, %v", login, err)
	}
	if login, _ := r.GetPasskeyLogin(ctx, "missing"); login != nil {
		t.Errorf("missing credential = %+v", login)
	}

	if err := r.UpdatePasskeyAfterUse(ctx, "cred-b", 9, true); err != nil {
		t.Fatal(err)
	}
	if login, _ := r.GetPasskeyLogin(ctx, "cred-b"); login.Counter != 9 || !login.IsBackedUp {
		t.Errorf("after use = %+v", login)
	}

	if updated, _ := r.UpdatePasskeyName(ctx, 3, owner, "Stolen"); updated {
		t.Error("renamed another user's passkey")
	}
	if updated, _ := r.UpdatePasskeyName(ctx, 1, owner, "My phone"); !updated {
		t.Error("rename failed")
	}

	page, err := r.FindUserPasskeys(ctx, owner, 1)
	if err != nil || page.Total != 2 || len(page.Results) != 2 {
		t.Fatalf("own passkeys = %+v, %v", page, err)
	}
	names := map[string]bool{}
	for _, record := range page.Results {
		names[record.Name] = true
	}
	if !names["My phone"] || !names["Key"] {
		t.Errorf("names = %v", names)
	}

	if deleted, _ := r.DeletePasskey(ctx, 3, owner); deleted {
		t.Error("deleted another user's passkey")
	}
	if deleted, _ := r.DeletePasskey(ctx, 1, owner); !deleted {
		t.Error("delete failed")
	}
	if login, _ := r.GetPasskeyLogin(ctx, "cred-a"); login != nil {
		t.Error("deleted passkey still signs in")
	}
}

func TestDeleteUserPasskeys(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	createTestPasskey(t, r, owner, "cred-a", "A")
	createTestPasskey(t, r, owner, "cred-b", "B")
	createTestPasskey(t, r, other, "cred-c", "C")

	if err := r.DeleteUserPasskeys(ctx, owner); err != nil {
		t.Fatal(err)
	}
	if credentials, err := r.GetUserPasskeyCredentials(ctx, owner); err != nil || len(credentials) != 0 {
		t.Errorf("owner credentials = %+v, %v", credentials, err)
	}
	if credentials, _ := r.GetUserPasskeyCredentials(ctx, other); len(credentials) != 1 {
		t.Errorf("other credentials = %+v", credentials)
	}
}
