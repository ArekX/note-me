package users

import (
	"context"
	"encoding/json"

	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

// Only the given keys change. Every tab gets the new session, so an intro
// dismissed in one tab does not show again in another.
func (n *Namespace) updateOnboarding(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		OnboardingState json.RawMessage `json:"onboarding_state"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var state messages.UserOnboardingState
	if issues := validation.Decode(msg.OnboardingState, &state); len(issues) > 0 {
		return prefixIssues(issues, "onboarding_state")
	}

	changes := map[string]bool{}
	for key, value := range map[string]*bool{
		"introduction_dismissed":            state.IntroductionDismissed,
		"view_note_introduction_dismissed":  state.ViewNoteIntroductionDismissed,
		"edit_note_introduction_dismissed":  state.EditNoteIntroductionDismissed,
		"backup_management_intro_dismissed": state.BackupManagementIntroDismissed,
	} {
		if value != nil {
			changes[key] = *value
		}
	}

	merged, err := n.repo.Users().UpdateOnboardingState(ctx, req.Client.UserID, changes)
	if err != nil {
		return err
	}
	if _, err := req.Hub.RefreshUserSession(ctx, req.Client.UserID); err != nil {
		return err
	}

	var response messages.UserOnboardingState
	encoded, _ := json.Marshal(merged)
	if err := json.Unmarshal(encoded, &response); err != nil {
		return err
	}
	req.RespondToUser(ctx, &messages.UpdateOnboardingStateResponse{
		Type:            messages.UsersUpdateOnboardingResponse,
		OnboardingState: response,
	})
	return nil
}

func prefixIssues(issues validation.Issues, key string) validation.Issues {
	for i := range issues {
		issues[i].Path = append([]any{key}, issues[i].Path...)
	}
	return issues
}
