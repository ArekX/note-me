package sqlrepo

import (
	"context"
	"errors"
	"testing"

	"noteme/internal/components/repository"
	"noteme/internal/encryption"
)

func TestUserProfile(t *testing.T) {
	ctx := context.Background()
	r := openTestRepository(t)

	id, err := r.CreateUserRecord(ctx, repository.NewUserRecord{
		Name:     "Jane",
		Username: "jane",
		Password: "password123",
		Role:     "user",
		Timezone: "Europe/London",
	})
	if err != nil {
		t.Fatal(err)
	}

	record, err := r.GetUserById(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if !record.IsPasswordResetRequired || record.CreatedAt != record.UpdatedAt || record.OnboardingState == nil || record.PreferredEditor != "rich" {
		t.Errorf("new user = %+v", record)
	}

	if _, err := r.UpdateUserProfile(ctx, id, repository.UserProfileData{OldPassword: "wrong-password", NewPassword: "password456"}); !errors.Is(err, repository.ErrIncorrectOldPassword) {
		t.Errorf("wrong old password error = %v", err)
	}

	updated, err := r.UpdateUserProfile(ctx, id, repository.UserProfileData{
		Name:        "Jane Doe",
		OldPassword: "password123",
		NewPassword: "password456",
	})
	if err != nil || !updated {
		t.Fatalf("UpdateUserProfile() = %v, %v", updated, err)
	}

	for password, want := range map[string]bool{"password123": false, "password456": true} {
		if valid, err := r.ValidateUserPassword(ctx, id, password); err != nil || valid != want {
			t.Errorf("ValidateUserPassword(%q) = %v, %v", password, valid, err)
		}
	}

	record, err = r.GetUserById(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if record.Name != "Jane Doe" || record.Timezone != "Europe/London" || record.IsPasswordResetRequired {
		t.Errorf("updated user = %+v", record)
	}

	var encryptionKey string
	if err := r.q.QueryRowContext(ctx, `SELECT encryption_key FROM "user" WHERE id = ?`, id).Scan(&encryptionKey); err != nil {
		t.Fatal(err)
	}
	if _, err := encryption.OpenNoteKey(encryptionKey, "password456"); err != nil {
		t.Errorf("key does not open with the new password: %v", err)
	}
}

func TestUpdateOnboardingStateMerges(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	id := createTestUser(t, r, "user")

	state, err := r.UpdateOnboardingState(ctx, id, map[string]bool{"introduction_dismissed": true})
	if err != nil || !state["introduction_dismissed"] || len(state) != 1 {
		t.Fatalf("first update = %v, %v", state, err)
	}
	state, err = r.UpdateOnboardingState(ctx, id, map[string]bool{"view_note_introduction_dismissed": true})
	if err != nil || !state["introduction_dismissed"] || !state["view_note_introduction_dismissed"] {
		t.Errorf("second update lost a key: %v, %v", state, err)
	}
	if record, _ := r.GetUserById(ctx, id); !record.OnboardingState["introduction_dismissed"] {
		t.Errorf("stored state = %v", record.OnboardingState)
	}
	if state, _ := r.UpdateOnboardingState(ctx, 999, map[string]bool{"introduction_dismissed": true}); state != nil {
		t.Errorf("missing user = %v", state)
	}
}

func TestProfilePicture(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	jane := createTestUser(t, r, "jane")
	john := createTestUser(t, r, "john")

	if record, _ := r.GetUserById(ctx, jane); record.ProfilePicture != "" {
		t.Errorf("new user picture = %q", record.ProfilePicture)
	}
	for _, id := range []int{jane, john} {
		if err := r.UpdateProfilePicture(ctx, id, "picture"); err != nil {
			t.Fatal(err)
		}
	}
	if record, _ := r.GetUserById(ctx, jane); record.ProfilePicture != "picture" {
		t.Errorf("picture = %q", record.ProfilePicture)
	}

	if err := r.UpdateProfilePicture(ctx, john, ""); err != nil {
		t.Fatal(err)
	}
	var stored *string
	if err := r.q.QueryRowContext(ctx, `SELECT "profile_picture" FROM "user" WHERE "id" = ?`, john).Scan(&stored); err != nil || stored != nil {
		t.Errorf("removed picture = %v, %v", stored, err)
	}

	if cleared, err := r.ClearProfilePicture(ctx, "other"); err != nil || cleared {
		t.Errorf("ClearProfilePicture(other) = %v, %v", cleared, err)
	}
	if cleared, err := r.ClearProfilePicture(ctx, "picture"); err != nil || !cleared {
		t.Errorf("ClearProfilePicture(picture) = %v, %v", cleared, err)
	}
	if record, _ := r.GetUserById(ctx, jane); record.ProfilePicture != "" {
		t.Errorf("cleared picture = %q", record.ProfilePicture)
	}
}

func TestUserLogin(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	id, err := r.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Jane", Username: "jane", Password: "password123", Role: "user"})
	if err != nil {
		t.Fatal(err)
	}

	for username, want := range map[string]bool{"jane": true, "Jane": false, "john": false} {
		if exists, err := r.UserExists(ctx, username); err != nil || exists != want {
			t.Errorf("UserExists(%s) = %v, %v", username, exists, err)
		}
	}

	record, err := r.GetUserByLogin(ctx, "jane", "password123")
	if err != nil || record == nil || record.Id != id || record.Timezone != "" {
		t.Fatalf("GetUserByLogin = %+v, %v", record, err)
	}
	for _, login := range [][2]string{{"jane", "wrong-password"}, {"john", "password123"}} {
		if record, err := r.GetUserByLogin(ctx, login[0], login[1]); err != nil || record != nil {
			t.Errorf("GetUserByLogin(%s, %s) = %+v, %v", login[0], login[1], record, err)
		}
	}

	if updated, err := r.UpdateUserProfile(ctx, id, repository.UserProfileData{Timezone: "Europe/Paris", PreferredEditor: "source"}); err != nil || !updated {
		t.Fatalf("UpdateUserProfile = %v, %v", updated, err)
	}
	if record, _ := r.GetUserById(ctx, id); record.Timezone != "Europe/Paris" || record.Name != "Jane" || record.PreferredEditor != "source" {
		t.Errorf("user with new timezone = %+v", record)
	}

	if _, err := r.DeleteUserRecord(ctx, id, id); err != nil {
		t.Fatal(err)
	}
	if exists, _ := r.UserExists(ctx, "jane"); exists {
		t.Error("deleted user exists")
	}
	if record, _ := r.GetUserByLogin(ctx, "jane", "password123"); record != nil {
		t.Error("deleted user can log in")
	}
}
