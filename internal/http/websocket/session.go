package websocket

import (
	"context"
	"fmt"

	"noteme/internal/components/repository"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/websocket/messages"
)

func (h *Hub) RefreshUserSession(ctx context.Context, userID int) (*repository.UserLoginRecord, error) {
	record, err := h.c.Repository.Users().GetUserById(ctx, userID)
	if err != nil || record == nil {
		return nil, err
	}

	session := requeststate.NewSession(record)
	data, err := session.ToJson()
	if err != nil {
		return nil, fmt.Errorf("encode session: %w", err)
	}
	if err := h.c.Repository.Sessions().UpdateUserSessionsData(ctx, userID, data); err != nil {
		return nil, err
	}

	for _, client := range h.userClients(userID) {
		client.setSession(*session)
	}
	h.SendToUser(ctx, userID, sessionUpdatedMessage(record, session))

	return record, nil
}

func sessionUpdatedMessage(record *repository.UserLoginRecord, session *requeststate.Session) *messages.SessionUpdated {
	permissions := []string{}
	for _, permission := range rbac.PermissionsFor(rbac.Role(record.Role)) {
		permissions = append(permissions, string(permission))
	}

	return &messages.SessionUpdated{
		Namespace: messages.NamespaceUsers,
		Type:      messages.UsersSessionUpdated,
		User: messages.UserLoginRecord{
			UserRecord: messages.UserRecord{
				ID:                      int64(record.Id),
				Name:                    record.Name,
				Username:                record.Username,
				Timezone:                record.Timezone,
				Role:                    record.Role,
				IsPasswordResetRequired: record.IsPasswordResetRequired,
				CreatedAt:               record.CreatedAt,
				UpdatedAt:               record.UpdatedAt,
			},
			OnboardingState: onboardingState(record.OnboardingState),
			PreferredEditor: record.PreferredEditor,
			ProfilePicture:  profilePicture(record),
		},
		Permissions:   permissions,
		RequiredSteps: session.RequiredSteps(),
	}
}

func profilePicture(record *repository.UserLoginRecord) *string {
	if record.ProfilePicture == "" {
		return nil
	}
	return &record.ProfilePicture
}

func onboardingState(state map[string]bool) messages.UserOnboardingState {
	flag := func(key string) *bool {
		if value, ok := state[key]; ok {
			return &value
		}
		return nil
	}

	return messages.UserOnboardingState{
		IntroductionDismissed:          flag("introduction_dismissed"),
		ViewNoteIntroductionDismissed:  flag("view_note_introduction_dismissed"),
		EditNoteIntroductionDismissed:  flag("edit_note_introduction_dismissed"),
		BackupManagementIntroDismissed: flag("backup_management_intro_dismissed"),
	}
}
