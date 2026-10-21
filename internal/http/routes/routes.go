package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/clientip"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
	"noteme/internal/http/websocket"
)

const (
	maxPasswordLength      = 128
	passwordTooLongMessage = "Password must have at most 128 characters"
)

type RouteFunc func(c *components.Components, w http.ResponseWriter, r *http.Request)

func HealthCheck(c *components.Components, w http.ResponseWriter, r *http.Request) {
	if err := c.DB.PingContext(r.Context()); err != nil {
		response.RespondJSON(w, http.StatusInternalServerError, map[string]string{"status": "database connection error"})
		c.Log.Error("Databse ping failed in healthcheck")
		return
	}

	response.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginUser struct {
	Id                      int             `json:"id"`
	Name                    string          `json:"name"`
	Username                string          `json:"username"`
	Role                    string          `json:"role"`
	Timezone                string          `json:"timezone"`
	OnboardingState         map[string]bool `json:"onboarding_state"`
	IsPasswordResetRequired bool            `json:"is_password_reset_required"`
	PreferredEditor         string          `json:"preferred_editor"`
	ProfilePicture          *string         `json:"profile_picture"`
	CreatedAt               int64           `json:"created_at"`
	UpdatedAt               int64           `json:"updated_at"`
}

type sessionResponse struct {
	User          loginUser         `json:"user"`
	Permissions   []rbac.Permission `json:"permissions"`
	RequiredSteps []string          `json:"required_steps"`
}

// The original login form had no length rules; a minimum password length here
// would lock out the initial admin/admin account.
func (r loginRequest) validate() string {
	if len(r.Username) < 1 {
		return "Username must have at least one character"
	}

	return ""
}

func requestActor(c *components.Components, r *http.Request, session *requeststate.Session) audit.Actor {
	actor := audit.Actor{Address: clientip.FromRequest(r, c.Config.TrustedProxies)}
	if session != nil {
		actor.UserID = session.UserId
		actor.Username = session.Username
	}
	return actor
}

func Login(c *components.Components, w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
		return
	}

	if msg := req.validate(); msg != "" {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}

	record, err := c.Repository.Users().GetUserByLogin(r.Context(), req.Username, req.Password)
	if err != nil {
		c.Log.Error("error while retrieving user by login", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	if record == nil {
		c.Audit.Record(r.Context(), audit.LoginFailed, requestActor(c, r, nil), map[string]any{"username": req.Username})
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Invalid username or password.",
		})
		return
	}

	c.Audit.Record(r.Context(), audit.LoginSucceeded, requestActor(c, r, requeststate.NewSession(record)), nil)
	startSession(c, w, r, record)
}

// Shared by password and passkey sign in: a new session id every time, and a
// successful sign in clears the rate limit for the address.
func startSession(c *components.Components, w http.ResponseWriter, r *http.Request, record *repository.UserLoginRecord) {
	data, err := requeststate.NewSession(record).ToJson()
	if err != nil {
		c.Log.Error("error while encoding session", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	sessionId := uuid.NewString()

	_, err = c.Repository.Sessions().CreateNewSession(r.Context(), repository.NewSessionRecord{
		Key:       sessionId,
		UserId:    record.Id,
		ExpiresAt: time.Now().Add(c.Config.CookieMaxAge).UnixMilli(),
		Data:      data,
	})
	if err != nil {
		c.Log.Error("error while creating session", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	if err := c.Repository.Sessions().DeleteExpiredSessions(r.Context()); err != nil {
		c.Log.Error("error while deleting expired sessions", "error", err)
	}

	c.LoginGuard.Reset(clientip.FromRequest(r, c.Config.TrustedProxies))

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sessionId,
		Path:     "/",
		MaxAge:   int(c.Config.CookieMaxAge.Seconds()),
		HttpOnly: true,
		Secure:   c.Config.CookieSecure,
		SameSite: http.SameSiteStrictMode,
	})

	response.RespondJSON(w, http.StatusOK, newSessionResponse(record))
}

func newSessionResponse(record *repository.UserLoginRecord) sessionResponse {
	return sessionResponse{
		User: loginUser{
			Id:                      record.Id,
			Name:                    record.Name,
			Username:                record.Username,
			Role:                    record.Role,
			Timezone:                record.Timezone,
			OnboardingState:         record.OnboardingState,
			IsPasswordResetRequired: record.IsPasswordResetRequired,
			PreferredEditor:         record.PreferredEditor,
			ProfilePicture:          profilePicture(record),
			CreatedAt:               record.CreatedAt,
			UpdatedAt:               record.UpdatedAt,
		},
		Permissions:   rbac.PermissionsFor(rbac.Role(record.Role)),
		RequiredSteps: requeststate.NewSession(record).RequiredSteps(),
	}
}

func profilePicture(record *repository.UserLoginRecord) *string {
	if record.ProfilePicture == "" {
		return nil
	}
	return &record.ProfilePicture
}

func Session(c *components.Components, w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	state, err := requeststate.FromCtx(ctx)
	if err != nil {
		c.Log.Error("error while retrieving request state", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	record, err := c.Repository.Users().GetUserById(ctx, state.Session.UserId)
	if err != nil {
		c.Log.Error("error while retrieving session user", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	if record == nil {
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
		return
	}

	response.RespondJSON(w, http.StatusOK, newSessionResponse(record))
}

// Every session of the user ends, as in the original, and their open
// connections with it (SF-03). A stale cookie is cleared too (SF-33).
func Logout(hub *websocket.Hub) RouteFunc {
	return func(c *components.Components, w http.ResponseWriter, r *http.Request) {
		state, err := requeststate.FromCtx(r.Context())
		if err != nil {
			c.Log.Error("error while retrieving request state", "error", err)
			response.RespondError(w, errors.New("Error while processing the request"))
			return
		}

		if state.Session != nil {
			if err := c.Repository.Sessions().DeleteSessionByUserId(r.Context(), state.Session.UserId); err != nil {
				c.Log.Error("error while deleting session", "error", err)
				response.RespondError(w, errors.New("Error while processing the request"))
				return
			}
			hub.LogoutUser(r.Context(), state.Session.UserId)
			c.Audit.Record(r.Context(), audit.Logout, requestActor(c, r, state.Session), nil)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   c.Config.CookieSecure,
			SameSite: http.SameSiteStrictMode,
		})

		response.RespondJSON(w, http.StatusOK, map[string]string{})
	}
}
