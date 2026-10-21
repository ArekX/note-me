package users

import (
	"context"
	"encoding/json"
	"strings"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
	"noteme/internal/timezone"
)

const (
	userExistsMessage        = "User with this username already exists."
	userNotFoundMessage      = "User not found."
	deleteSelfMessage        = "You cannot delete your own user."
	changeOwnRoleMessage     = "You cannot change your own role."
	changeOwnPasswordMessage = "Please change your password via profile page."
	lastAdminMessage         = "Cannot remove the last administrator."
	usernameTooLongMessage   = "Username must have at most 60 characters"
)

func (n *Namespace) registerUserManagement(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceUsers, messages.UsersCreate, n.createUser)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdate, n.updateUser)
	hub.Handle(messages.NamespaceUsers, messages.UsersDelete, n.deleteUser)
	hub.Handle(messages.NamespaceUsers, messages.UsersFind, n.findUsers)
}

func roleIssue() validation.Issue {
	quoted := make([]string, len(rbac.RoleNames))
	for i, role := range rbac.RoleNames {
		quoted[i] = `"` + string(role) + `"`
	}
	return validation.Issue{Code: "invalid_value", Path: []any{"role"}, Message: "Invalid option: expected one of " + strings.Join(quoted, "|")}
}

func timezoneIssue() validation.Issue {
	return validation.Issue{Code: "invalid_value", Path: []any{"timezone"}, Message: "Invalid option: expected one of the supported timezones"}
}

// addUserSchema of the original, issues in its field order.
func validateAddUser(data messages.AddUserRequest) validation.Issues {
	var issues validation.Issues
	issues.MinLength("name", data.Name, 1, "Name must have at least one character")
	issues.MaxLength("name", data.Name, maxNameLength, nameTooLongMessage)
	issues.MinLength("username", data.Username, 1, "Username must have at least one character")
	issues.MaxLength("username", data.Username, maxUsernameLength, usernameTooLongMessage)
	issues.MinLength("password", data.Password, minPasswordLength, "Password must have at least 8 characters")
	issues.MaxLength("password", data.Password, maxPasswordLength, passwordTooLongError)
	if !rbac.IsRole(data.Role) {
		issues = append(issues, roleIssue())
	}
	if !timezone.IsValid(data.Timezone) {
		issues = append(issues, timezoneIssue())
	}
	return issues
}

// updateUserSchema of the original.
func validateUpdateUser(data messages.UpdateUserRequest) validation.Issues {
	var issues validation.Issues
	issues.MinLength("name", data.Name, 1, "Name must have at least one character")
	issues.MaxLength("name", data.Name, maxNameLength, nameTooLongMessage)
	if data.NewPassword != nil {
		issues.MinLength("new_password", *data.NewPassword, minPasswordLength, "Password must have at least 8 characters")
		issues.MaxLength("new_password", *data.NewPassword, maxPasswordLength, passwordTooLongError)
	}
	if !rbac.IsRole(data.Role) {
		issues = append(issues, roleIssue())
	}
	if !timezone.IsValid(data.Timezone) {
		issues = append(issues, timezoneIssue())
	}
	return issues
}

func (n *Namespace) createUser(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanUpdateUsers); err != nil {
		return err
	}

	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var data messages.AddUserRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if issues := validateAddUser(data); len(issues) > 0 {
		return issues
	}

	exists, err := n.repo.Users().UserExists(ctx, data.Username)
	if err != nil {
		return err
	}
	if exists {
		return websocket.NewClientError(userExistsMessage)
	}
	id, err := n.repo.Users().CreateUserRecord(ctx, repository.NewUserRecord{
		Name: data.Name, Username: data.Username, Password: data.Password, Role: data.Role, Timezone: data.Timezone,
	})
	if err != nil {
		return err
	}
	n.audit.Record(ctx, audit.UserCreated, req.Client.Actor(), map[string]any{"user_id": id, "username": data.Username, "role": data.Role})

	req.RespondToUser(ctx, &messages.CreateUserResponse{
		Type: messages.UsersCreateResponse,
		Data: messages.UserID{ID: int64(id)},
	})
	notifyAdmins(ctx, req, id)
	return nil
}

// The admin who made the change gets the response; a changed user gets
// sessionUpdated, a deleted one forceLogoutResponse.
func notifyAdmins(ctx context.Context, req *websocket.Request, userID int) {
	req.Hub.SendToPermission(ctx, rbac.CanUpdateUsers, req.Client.UserID, messages.NewDataChanged(messages.EntityUser, int64(userID)))
}

func (n *Namespace) lastAdmin(ctx context.Context, record *repository.UserLoginRecord) (bool, error) {
	if record.Role != string(rbac.RoleAdmin) {
		return false, nil
	}
	admins, err := n.repo.UserManagement().CountUsersWithRole(ctx, record.Role)
	if err != nil {
		return false, err
	}
	return admins <= 1, nil
}

// The changed user's open tabs get the new session right away (0.9.n). Not in
// the original: an admin cannot change their own role or password here (the
// form only hid those fields), the response does not echo the password, and
// the last administrator keeps the role (SF-37).
func (n *Namespace) updateUser(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanUpdateUsers); err != nil {
		return err
	}

	var msg struct {
		ID   int64           `json:"id"`
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var data messages.UpdateUserRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if issues := validateUpdateUser(data); len(issues) > 0 {
		return issues
	}

	id := int(msg.ID)
	if id == req.Client.UserID {
		if data.Role != req.Client.Session().Role {
			return websocket.NewClientError(changeOwnRoleMessage)
		}
		if data.NewPassword != nil {
			return websocket.NewClientError(changeOwnPasswordMessage)
		}
	}

	target, err := n.repo.Users().GetUserById(ctx, id)
	if err != nil {
		return err
	}
	if target == nil {
		return websocket.NewClientError(userNotFoundMessage)
	}
	if data.Role != target.Role {
		last, err := n.lastAdmin(ctx, target)
		if err != nil {
			return err
		}
		if last {
			return websocket.NewClientError(lastAdminMessage)
		}
	}

	update := repository.UserUpdate{Name: data.Name, Role: data.Role, Timezone: data.Timezone}
	if data.NewPassword != nil {
		update.NewPassword = *data.NewPassword
	}
	updated, err := n.repo.UserManagement().UpdateUserRecord(ctx, id, update)
	if err != nil {
		return err
	}
	if !updated {
		return websocket.NewClientError(userNotFoundMessage)
	}

	details := map[string]any{"user_id": id, "username": target.Username}
	if data.Role != target.Role {
		details["previous_role"] = target.Role
		details["role"] = data.Role
	}
	if data.NewPassword != nil {
		details["password_reset"] = true
	}
	n.audit.Record(ctx, audit.UserUpdated, req.Client.Actor(), details)

	if _, err := req.Hub.RefreshUserSession(ctx, id); err != nil {
		return err
	}

	data.NewPassword = nil
	req.RespondToUser(ctx, &messages.UpdateUserResponse{
		Type:        messages.UsersUpdateResponse,
		UpdatedID:   msg.ID,
		UpdatedData: data,
	})
	notifyAdmins(ctx, req, id)
	return nil
}

// Everything the user owns goes with them (decision 0.72), their uploaded
// files are removed from disk, and every open tab is logged out.
func (n *Namespace) deleteUser(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanUpdateUsers); err != nil {
		return err
	}

	var msg messages.DeleteUser
	if err := req.Decode(&msg); err != nil {
		return err
	}
	id := int(msg.ID)
	if id == req.Client.UserID {
		return websocket.NewClientError(deleteSelfMessage)
	}

	target, err := n.repo.Users().GetUserById(ctx, id)
	if err != nil {
		return err
	}
	if target == nil {
		return websocket.NewClientError(userNotFoundMessage)
	}
	last, err := n.lastAdmin(ctx, target)
	if err != nil {
		return err
	}
	if last {
		return websocket.NewClientError(lastAdminMessage)
	}

	deleted, err := n.repo.UserManagement().DeleteUserRecord(ctx, id, req.Client.UserID)
	if err != nil {
		return err
	}
	if deleted == nil {
		return websocket.NewClientError(userNotFoundMessage)
	}
	for _, identifier := range deleted.FileIdentifiers {
		if err := n.storage.RemoveFile(identifier); err != nil {
			n.log.Error("Could not remove a deleted user's file", "identifier", identifier, "error", err)
		}
	}
	n.audit.Record(ctx, audit.UserDeleted, req.Client.Actor(), map[string]any{"user_id": id, "username": target.Username})

	req.Hub.LogoutUser(ctx, id)

	req.RespondToUser(ctx, &messages.DeleteUserResponse{
		Type:      messages.UsersDeleteResponse,
		DeletedID: msg.ID,
	})
	notifyAdmins(ctx, req, id)
	return nil
}

func (n *Namespace) findUsers(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanUpdateUsers); err != nil {
		return err
	}

	var msg messages.FindUsers
	if err := req.Decode(&msg); err != nil {
		return err
	}

	records, err := n.repo.UserManagement().FindUsers(ctx, repository.UserFilters{
		Name:     strings.TrimSpace(msg.Filters.Name),
		Username: strings.TrimSpace(msg.Filters.Username),
		Role:     msg.Filters.Role,
	}, msg.Page)
	if err != nil {
		return err
	}

	results := make([]messages.UserRecord, 0, len(records.Results))
	for _, record := range records.Results {
		results = append(results, messages.UserRecord{
			ID:                      int64(record.Id),
			Name:                    record.Name,
			Username:                record.Username,
			Timezone:                record.Timezone,
			Role:                    record.Role,
			IsPasswordResetRequired: record.IsPasswordResetRequired,
			CreatedAt:               record.CreatedAt,
			UpdatedAt:               record.UpdatedAt,
		})
	}

	return req.Respond(ctx, &messages.FindUsersResponse{
		Type: messages.UsersFindResponse,
		Records: messages.Paged[messages.UserRecord]{
			Results: results,
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
	})
}
