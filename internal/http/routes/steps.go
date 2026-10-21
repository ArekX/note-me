package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/loginguard"
	"noteme/internal/components/repository"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
)

type stepRequest struct {
	Step   string          `json:"step"`
	Action string          `json:"action"`
	Data   json.RawMessage `json:"data"`
}

type stepAction struct {
	requiresPending bool
	handle          func(c *components.Components, hub *websocket.Hub, r *http.Request, state *requeststate.RequestState, data json.RawMessage) error
}

var userSteps = map[string]map[string]stepAction{
	requeststate.StepPasswordReset: {
		"change": {requiresPending: true, handle: changePasswordStep},
	},
}

var (
	errSamePassword    = errors.New("New password must be different from the old password.")
	errPasswordsLocked = errors.New(loginguard.PasswordLockedMessage)
)

func ProcessStep(hub *websocket.Hub) RouteFunc {
	return func(c *components.Components, w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

		var req stepRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
			return
		}

		action, ok := userSteps[req.Step][req.Action]
		if !ok {
			response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "Unknown step or action."})
			return
		}

		state, err := requeststate.FromCtx(r.Context())
		if err != nil {
			c.Log.Error("error while retrieving request state", "error", err)
			response.RespondError(w, errors.New("Error while processing the request"))
			return
		}

		if action.requiresPending && !slices.Contains(state.Session.RequiredSteps(), req.Step) {
			response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "This step is not pending for the user."})
			return
		}

		if err := action.handle(c, hub, r, state, req.Data); err != nil {
			var issues validation.Issues
			if errors.As(err, &issues) || errors.Is(err, errSamePassword) || errors.Is(err, repository.ErrIncorrectOldPassword) {
				response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			if errors.Is(err, errPasswordsLocked) {
				response.RespondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
				return
			}
			c.Log.Error("error while processing user step", "step", req.Step, "action", req.Action, "error", err)
			response.RespondError(w, errors.New("Error while processing the request"))
			return
		}

		record, err := hub.RefreshUserSession(r.Context(), state.Session.UserId)
		if err != nil {
			c.Log.Error("error while refreshing user session", "error", err)
			response.RespondError(w, errors.New("Error while processing the request"))
			return
		}
		if record == nil {
			response.RespondJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}

		response.RespondJSON(w, http.StatusOK, newSessionResponse(record))
	}
}

type changePasswordRequest struct {
	OldPassword     string `json:"old_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

func (req changePasswordRequest) validate() validation.Issues {
	var issues validation.Issues
	issues.MinLength("old_password", req.OldPassword, 1, "")
	issues.MaxLength("old_password", req.OldPassword, maxPasswordLength, passwordTooLongMessage)
	issues.MinLength("new_password", req.NewPassword, 8, "Password must have at least 8 characters")
	issues.MaxLength("new_password", req.NewPassword, maxPasswordLength, passwordTooLongMessage)
	issues.MinLength("confirm_password", req.ConfirmPassword, 8, "Password must have at least 8 characters")
	issues.MaxLength("confirm_password", req.ConfirmPassword, maxPasswordLength, passwordTooLongMessage)

	if !newPasswordsMatch(req.OldPassword, req.NewPassword, req.ConfirmPassword) {
		issues.Custom("new_password", "New password must match confirm password and must be at least 8 characters.")
		issues.Custom("confirm_password", "Confirm password must match new password and must be at least 8 characters.")
	}

	return issues
}

func newPasswordsMatch(oldPassword, newPassword, confirmPassword string) bool {
	if oldPassword == "" {
		return true
	}
	if validation.Length(newPassword) < 8 || validation.Length(confirmPassword) < 8 {
		return false
	}
	return newPassword == confirmPassword
}

// Wrong old passwords count towards the user's password lock (SF-04); a
// change ends the user's other sessions (SF-03).
func changePasswordStep(c *components.Components, hub *websocket.Hub, r *http.Request, state *requeststate.RequestState, data json.RawMessage) error {
	var req changePasswordRequest
	if issues := validation.Decode(data, &req); len(issues) > 0 {
		return issues
	}
	if issues := req.validate(); len(issues) > 0 {
		return issues
	}

	if req.OldPassword == req.NewPassword {
		return errSamePassword
	}

	userID := state.Session.UserId
	if c.PasswordGuard.Locked(userID) {
		return errPasswordsLocked
	}
	_, err := c.Repository.Users().UpdateUserProfile(r.Context(), userID, repository.UserProfileData{
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if errors.Is(err, repository.ErrIncorrectOldPassword) {
		if c.PasswordGuard.Fail(userID) {
			c.Audit.Record(r.Context(), audit.PasswordAttemptsLocked, requestActor(c, r, state.Session), nil)
		}
		return err
	}
	if err != nil {
		return err
	}
	c.PasswordGuard.Succeed(userID)

	if err := c.Repository.Sessions().DeleteOtherSessions(r.Context(), userID, state.SessionKey); err != nil {
		return err
	}
	hub.LogoutOtherSessions(r.Context(), userID, state.SessionKey)
	c.Audit.Record(r.Context(), audit.PasswordChanged, requestActor(c, r, state.Session), nil)
	return nil
}
