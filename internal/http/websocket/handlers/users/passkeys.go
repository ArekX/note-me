package users

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"noteme/internal/components/audit"
	"noteme/internal/components/passkeys"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	passkeyUnavailableMessage = "Passkeys are not available on this server."
	passkeyExpiredMessage     = "Passkey registration has expired, please try again."
	passkeyNotStoredMessage   = "This authenticator cannot store the passkey on the device, so it could not be used to sign in. Use a password manager, phone or security key that supports passkeys."
	passkeyExistsMessage      = "This passkey is already registered to this or another account."
	passkeyFailedMessage      = "Verification failed."
	passkeyBusyMessage        = "Passkey registration is busy, please try again later."
	maxPasskeyNameLength      = 255
)

func passkeyAccount(req *websocket.Request) passkeys.Account {
	session := req.Client.Session()
	return passkeys.Account{ID: req.Client.UserID, Username: session.Username, Name: session.Name}
}

// Not in the original: the current password is asked for before a passkey is
// added and stays confirmed for five minutes in this session (decision 0.50);
// wrong passwords count towards the user's password lock (SF-04).
func (n *Namespace) getPasskeyRegistrationOptions(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetPasskeyRegistration
	if err := req.Decode(&msg); err != nil {
		return err
	}

	sessionKey := req.Client.SessionKey
	if sessionKey == "" {
		return errors.New("websocket client has no session key")
	}

	if !n.passkeys.IsPasswordConfirmed(sessionKey) {
		if msg.Password == nil {
			return req.Respond(ctx, &messages.GetPasskeyRegistrationResponse{
				Type:             messages.UsersGetPasskeyRegistrationResponse,
				PasswordRequired: true,
			})
		}
		valid, err := n.validatePassword(ctx, req, *msg.Password)
		if err != nil {
			return err
		}
		if !valid {
			var issues validation.Issues
			issues.Custom("password", "Invalid password.")
			return issues
		}
		if err := n.passkeys.ConfirmPassword(sessionKey); err != nil {
			return registrationError(err)
		}
	}

	options, err := n.passkeys.BeginRegistration(ctx, sessionKey, passkeyAccount(req))
	if err != nil {
		return registrationError(err)
	}
	encoded, err := json.Marshal(options)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.GetPasskeyRegistrationResponse{
		Type:    messages.UsersGetPasskeyRegistrationResponse,
		Options: encoded,
	})
}

func registrationError(err error) error {
	switch {
	case errors.Is(err, passkeys.ErrUnavailable):
		return websocket.NewClientError(passkeyUnavailableMessage)
	case errors.Is(err, passkeys.ErrBusy):
		return websocket.NewClientError(passkeyBusyMessage)
	}
	return err
}

func (n *Namespace) verifyPasskeyRegistration(ctx context.Context, req *websocket.Request) error {
	var msg messages.VerifyPasskeyRegistration
	if err := req.Decode(&msg); err != nil {
		return err
	}

	err := n.passkeys.FinishRegistration(ctx, req.Client.SessionKey, passkeyAccount(req), msg.Response)
	reason := ""
	switch {
	case err == nil:
	case errors.Is(err, passkeys.ErrUnavailable):
		reason = passkeyUnavailableMessage
	case errors.Is(err, passkeys.ErrExpired):
		reason = passkeyExpiredMessage
	case errors.Is(err, passkeys.ErrNotDiscoverable):
		reason = passkeyNotStoredMessage
	case errors.Is(err, passkeys.ErrAlreadyRegistered):
		reason = passkeyExistsMessage
	case errors.Is(err, passkeys.ErrVerification):
		n.log.Info("Passkey registration failed", "user", req.Client.UserID, "error", err)
		reason = passkeyFailedMessage
	default:
		return err
	}
	response := &messages.VerifyPasskeyRegistrationResponse{
		Type:               messages.UsersVerifyPasskeyRegistrationResponse,
		RegistrationResult: messages.RegistrationResult{Success: reason == "", FailReason: reason},
	}
	if reason != "" {
		return req.Respond(ctx, response)
	}
	n.audit.Record(ctx, audit.PasskeyRegistered, req.Client.Actor(), nil)
	req.RespondToUser(ctx, response)
	return nil
}

func (n *Namespace) getOwnPasskeys(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetOwnPasskeys
	if err := req.Decode(&msg); err != nil {
		return err
	}

	records, err := n.repo.Passkeys().FindUserPasskeys(ctx, req.Client.UserID, msg.Page)
	if err != nil {
		return err
	}

	results := make([]messages.UserPasskeyRecord, 0, len(records.Results))
	for _, record := range records.Results {
		results = append(results, messages.UserPasskeyRecord{
			ID:         int64(record.Id),
			Name:       record.Name,
			LastUsedAt: record.LastUsedAt,
			CreatedAt:  record.CreatedAt,
			Transports: record.Transports,
		})
	}

	return req.Respond(ctx, &messages.GetOwnPasskeysResponse{
		Type: messages.UsersGetOwnPasskeysResponse,
		Records: messages.Paged[messages.UserPasskeyRecord]{
			Results: results,
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
	})
}

func (n *Namespace) deleteOwnPasskey(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteOwnPasskey
	if err := req.Decode(&msg); err != nil {
		return err
	}

	deleted, err := n.repo.Passkeys().DeletePasskey(ctx, int(msg.ID), req.Client.UserID)
	if err != nil {
		return err
	}
	if deleted {
		n.audit.Record(ctx, audit.PasskeyDeleted, req.Client.Actor(), map[string]any{"passkey_id": msg.ID})
	}

	req.RespondToUser(ctx, &messages.DeleteOwnPasskeyResponse{
		Type: messages.UsersDeleteOwnPasskeyResponse,
		ID:   msg.ID,
	})
	return nil
}

// Not in the original, which saved any name including an empty one.
func (n *Namespace) updateOwnPasskey(ctx context.Context, req *websocket.Request) error {
	var msg messages.UpdateOwnPasskey
	if err := req.Decode(&msg); err != nil {
		return err
	}

	name := strings.TrimSpace(msg.Name)
	var issues validation.Issues
	issues.MinLength("name", name, 1, "Name must have at least one character")
	issues.MaxLength("name", name, maxPasskeyNameLength, "Name must have at most 255 characters")
	if len(issues) > 0 {
		return issues
	}

	if _, err := n.repo.Passkeys().UpdatePasskeyName(ctx, int(msg.ID), req.Client.UserID, name); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.UpdateOwnPasskeyResponse{
		Type: messages.UsersUpdateOwnPasskeyResponse,
		ID:   msg.ID,
		Name: name,
	})
	return nil
}
