package routes

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-webauthn/webauthn/protocol"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/passkeys"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

const (
	passkeyUnavailableMessage = "Passkeys are not available on this server."
	passkeyInvalidMessage     = "Invalid passkey request."
	passkeyExpiredMessage     = "Passkey sign in has expired, please try again."
	passkeyFailedMessage      = "Could not verify your passkey, make sure it is registered to your account."
	passkeyBusyMessage        = "Passkey sign in is busy, please try again later."
)

type passkeyOptionsResponse struct {
	RequestID string                                      `json:"request_id"`
	Options   *protocol.PublicKeyCredentialRequestOptions `json:"options"`
}

type passkeyLoginRequest struct {
	RequestID string          `json:"request_id"`
	Response  json.RawMessage `json:"response"`
}

func PasskeyLoginOptions(c *components.Components, w http.ResponseWriter, r *http.Request) {
	requestID, options, err := c.Passkeys.BeginLogin()
	if errors.Is(err, passkeys.ErrUnavailable) {
		response.RespondJSON(w, http.StatusServiceUnavailable, map[string]string{"error": passkeyUnavailableMessage})
		return
	}
	if errors.Is(err, passkeys.ErrBusy) {
		response.RespondJSON(w, http.StatusServiceUnavailable, map[string]string{"error": passkeyBusyMessage})
		return
	}
	if err != nil {
		c.Log.Error("error while starting passkey login", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	response.RespondJSON(w, http.StatusOK, passkeyOptionsResponse{RequestID: requestID, Options: options})
}

func PasskeyLogin(c *components.Components, w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req passkeyLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RequestID == "" || len(req.Response) == 0 {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": passkeyInvalidMessage})
		return
	}

	userID, err := c.Passkeys.FinishLogin(r.Context(), req.RequestID, req.Response)
	switch {
	case errors.Is(err, passkeys.ErrUnavailable):
		response.RespondJSON(w, http.StatusServiceUnavailable, map[string]string{"error": passkeyUnavailableMessage})
		return
	case errors.Is(err, passkeys.ErrExpired):
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": passkeyExpiredMessage})
		return
	case errors.Is(err, passkeys.ErrVerification):
		c.Log.Info("Passkey login failed", "error", err)
		c.Audit.Record(r.Context(), audit.PasskeyLoginFailed, requestActor(c, r, nil), nil)
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{"error": passkeyFailedMessage})
		return
	case err != nil:
		c.Log.Error("error while finishing passkey login", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}

	record, err := c.Repository.Users().GetUserById(r.Context(), userID)
	if err != nil {
		c.Log.Error("error while retrieving passkey user", "error", err)
		response.RespondError(w, errors.New("Error while processing the request"))
		return
	}
	if record == nil {
		c.Audit.Record(r.Context(), audit.PasskeyLoginFailed, requestActor(c, r, nil), map[string]any{"user_id": userID})
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{"error": passkeyFailedMessage})
		return
	}

	c.Audit.Record(r.Context(), audit.PasskeyLoginSucceeded, requestActor(c, r, requeststate.NewSession(record)), nil)
	startSession(c, w, r, record)
}
