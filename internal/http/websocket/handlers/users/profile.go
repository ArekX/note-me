package users

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
	"noteme/internal/timezone"
)

const minPasswordLength = 8

var preferredEditors = []string{"rich", "source"}

// userProfileSchema of the original. zod lists every allowed timezone in the
// enum message; that list comes from the browser, so the server names it.
func validateProfile(data messages.EditUserProfile) validation.Issues {
	var issues validation.Issues
	issues.MinLength("name", data.Name, 1, "Name must have at least one character")
	issues.MaxLength("name", data.Name, maxNameLength, nameTooLongMessage)
	timezoneValid := timezone.IsValid(data.Timezone)
	if !timezoneValid {
		issues = append(issues, validation.Issue{Code: "invalid_value", Path: []any{"timezone"}, Message: "Invalid option: expected one of the supported timezones"})
	}
	editorValid := data.PreferredEditor == "" || slices.Contains(preferredEditors, data.PreferredEditor)
	if !editorValid {
		issues = append(issues, validation.Issue{Code: "invalid_value", Path: []any{"preferred_editor"}, Message: `Invalid option: expected one of "rich"|"source"`})
	}

	oldPassword, newPassword, confirmPassword := "", "", ""
	if data.OldPassword != nil {
		oldPassword = *data.OldPassword
		issues.MinLength("old_password", oldPassword, 1, "")
		issues.MaxLength("old_password", oldPassword, maxPasswordLength, passwordTooLongError)
	}
	if data.NewPassword != nil {
		newPassword = *data.NewPassword
		issues.MinLength("new_password", newPassword, minPasswordLength, "Password must have at least 8 characters")
		issues.MaxLength("new_password", newPassword, maxPasswordLength, passwordTooLongError)
	}
	if data.ConfirmPassword != nil {
		confirmPassword = *data.ConfirmPassword
		issues.MinLength("confirm_password", confirmPassword, minPasswordLength, "Password must have at least 8 characters")
		issues.MaxLength("confirm_password", confirmPassword, maxPasswordLength, passwordTooLongError)
	}

	// zod skips the object refinements after an invalid enum value but not
	// after too_small issues.
	if timezoneValid && editorValid && !passwordsMatch(oldPassword, newPassword, confirmPassword) {
		issues.Custom("new_password", "New password must match confirm password and must be at least 8 characters.")
		issues.Custom("confirm_password", "Confirm password must match new password and must be at least 8 characters.")
	}
	// Not in the original, which skipped the password change silently (0.47).
	if timezoneValid && editorValid && oldPassword == "" && (newPassword != "" || confirmPassword != "") {
		issues.Custom("old_password", "Old password is required to change the password.")
	}
	return issues
}

func passwordsMatch(oldPassword, newPassword, confirmPassword string) bool {
	if oldPassword == "" {
		return true
	}
	if validation.Length(newPassword) < minPasswordLength || validation.Length(confirmPassword) < minPasswordLength {
		return false
	}
	return newPassword == confirmPassword
}

// A password change ends the user's other sessions: their rows go, their
// connections are logged out, and only this session is refreshed (SF-03).
func (n *Namespace) updateProfile(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.EditUserProfile
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if issues := validateProfile(data); len(issues) > 0 {
		return issues
	}

	profile := repository.UserProfileData{Name: data.Name, Timezone: data.Timezone, PreferredEditor: data.PreferredEditor}
	changingPassword := data.OldPassword != nil && data.NewPassword != nil
	if changingPassword {
		if *data.OldPassword == *data.NewPassword {
			return websocket.NewClientError("New password must be different from the old password.")
		}
		if err := n.passwordLocked(req); err != nil {
			return err
		}
		profile.OldPassword = *data.OldPassword
		profile.NewPassword = *data.NewPassword
	}

	userID := req.Client.UserID
	updated, err := n.repo.Users().UpdateUserProfile(ctx, userID, profile)
	if errors.Is(err, repository.ErrIncorrectOldPassword) {
		n.passwordChecked(ctx, req, false)
		return websocket.NewClientError(err.Error())
	}
	if err != nil {
		return err
	}
	if changingPassword {
		n.passwordChecked(ctx, req, true)
		if err := n.repo.Sessions().DeleteOtherSessions(ctx, userID, req.Client.SessionKey); err != nil {
			return err
		}
		req.Hub.LogoutOtherSessions(ctx, userID, req.Client.SessionKey)
		n.audit.Record(ctx, audit.PasswordChanged, req.Client.Actor(), nil)
	}
	if updated {
		if _, err := req.Hub.RefreshUserSession(ctx, userID); err != nil {
			return err
		}
	}

	// The original echoed the passwords back (0.9.k).
	req.RespondToUser(ctx, &messages.UpdateProfileResponse{
		Type: messages.UsersUpdateProfileResponse,
		Data: messages.EditUserProfile{Name: data.Name, Timezone: data.Timezone, PreferredEditor: data.PreferredEditor},
	})
	if updated {
		notifyAdmins(ctx, req, userID)
	}
	return nil
}

// Only the user's own finished image files can be set.
func (n *Namespace) updateProfilePicture(ctx context.Context, req *websocket.Request) error {
	var msg messages.UpdateProfilePicture
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	identifier := ""
	if msg.Identifier != nil {
		identifier = *msg.Identifier
		file, err := n.repo.Files().GetFileData(ctx, identifier)
		if err != nil {
			return err
		}
		if file == nil || file.UserId != userID {
			return websocket.NewClientError("File not found.")
		}
		if !strings.HasPrefix(file.MimeType, "image/") {
			return websocket.NewClientError("Profile picture must be an image.")
		}
	}

	if err := n.repo.Users().UpdateProfilePicture(ctx, userID, identifier); err != nil {
		return err
	}
	if _, err := req.Hub.RefreshUserSession(ctx, userID); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.UpdateProfilePictureResponse{
		Type:       messages.UsersUpdateProfilePictureResponse,
		Identifier: msg.Identifier,
	})
	return nil
}
