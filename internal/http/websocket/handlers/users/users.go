package users

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/jobs"
	"noteme/internal/components/loginguard"
	"noteme/internal/components/passkeys"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/encryption"
	"noteme/internal/eventbus"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	oldFormatMessage     = "Protected notes are stored in an old encryption format. Ask an administrator to run noteme-upgrade."
	unconvertedMessage   = "This note was protected before the encryption upgrade and could not be converted, its content cannot be recovered."
	decryptMessage       = "Could not decrypt, wrong password or corrupted data."
	maxNameLength        = 255
	maxUsernameLength    = 60
	maxPasswordLength    = 128
	nameTooLongMessage   = "Name must have at most 255 characters"
	passwordTooLongError = "Password must have at most 128 characters"
)

type Namespace struct {
	repo     repository.Repository
	passkeys *passkeys.Passkeys
	guard    *loginguard.PasswordGuard
	audit    *audit.Log
	jobs     *jobs.Queue
	bus      *eventbus.Bus
	storage  *storage.Storage
	log      *slog.Logger
}

func New(c *components.Components) *Namespace {
	return &Namespace{repo: c.Repository, passkeys: c.Passkeys, guard: c.PasswordGuard, audit: c.Audit, jobs: c.Jobs, bus: c.Bus, storage: c.Storage, log: c.Log}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceUsers, messages.UsersVerifyOwnPassword, n.verifyOwnPassword)
	hub.Handle(messages.NamespaceUsers, messages.UsersEncryptText, n.encryptText)
	hub.Handle(messages.NamespaceUsers, messages.UsersDecryptText, n.decryptText)
	hub.Handle(messages.NamespaceUsers, messages.UsersFindPick, n.findPickUsers)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdateProfile, n.updateProfile)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdateOnboarding, n.updateOnboarding)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdateProfilePicture, n.updateProfilePicture)
	hub.Handle(messages.NamespaceUsers, messages.UsersGetPasskeyRegistration, n.getPasskeyRegistrationOptions)
	hub.Handle(messages.NamespaceUsers, messages.UsersVerifyPasskeyRegistration, n.verifyPasskeyRegistration)
	hub.Handle(messages.NamespaceUsers, messages.UsersGetOwnPasskeys, n.getOwnPasskeys)
	hub.Handle(messages.NamespaceUsers, messages.UsersDeleteOwnPasskey, n.deleteOwnPasskey)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdateOwnPasskey, n.updateOwnPasskey)
	n.registerExport(hub)
	n.registerMcpClients(hub)
	n.registerUserManagement(hub)
}

const minPickerQuery = 2

// Searching starts at two characters in either filter, as in the original.
func (n *Namespace) findPickUsers(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindPickUsers
	if err := req.Decode(&msg); err != nil {
		return err
	}

	name := strings.TrimSpace(msg.Filters.Name)
	username := strings.TrimSpace(msg.Filters.Username)
	response := &messages.FindPickUsersResponse{
		Type:    messages.UsersFindPickResponse,
		Records: messages.Paged[messages.PickUserRecord]{Results: []messages.PickUserRecord{}, Page: 1, PerPage: 5},
	}
	if validation.Length(name) < minPickerQuery && validation.Length(username) < minPickerQuery {
		return req.Respond(ctx, response)
	}

	records, err := n.repo.Shares().FindPickerUsers(ctx, repository.PickUserFilters{
		Name:           name,
		Username:       username,
		UserIds:        msg.Filters.UserIDs,
		ExcludeUserIds: msg.Filters.ExcludeUserIDs,
	}, msg.Page)
	if err != nil {
		return err
	}

	response.Records = messages.Paged[messages.PickUserRecord]{
		Results: make([]messages.PickUserRecord, 0, len(records.Results)),
		Total:   records.Total,
		Page:    records.Page,
		PerPage: records.PerPage,
	}
	for _, record := range records.Results {
		response.Records.Results = append(response.Records.Results, messages.PickUserRecord{ID: record.Id, Name: record.Name, Username: record.Username})
	}
	return req.Respond(ctx, response)
}

// Every password check of a signed in user counts towards the lock; it is
// keyed by the user, not the address (decision SF-04).
func (n *Namespace) passwordLocked(req *websocket.Request) error {
	if n.guard.Locked(req.Client.UserID) {
		return websocket.NewClientError(loginguard.PasswordLockedMessage)
	}
	return nil
}

func (n *Namespace) passwordChecked(ctx context.Context, req *websocket.Request, valid bool) {
	if valid {
		n.guard.Succeed(req.Client.UserID)
		return
	}
	if n.guard.Fail(req.Client.UserID) {
		n.audit.Record(ctx, audit.PasswordAttemptsLocked, req.Client.Actor(), nil)
	}
}

func (n *Namespace) validatePassword(ctx context.Context, req *websocket.Request, password string) (bool, error) {
	if err := n.passwordLocked(req); err != nil {
		return false, err
	}
	valid, err := n.repo.Users().ValidateUserPassword(ctx, req.Client.UserID, password)
	if err != nil {
		return false, err
	}
	n.passwordChecked(ctx, req, valid)
	return valid, nil
}

// Argon2id runs on every call (64 MiB, decision 0.14); the key is never kept
// on the server. A wrong password shows as a key that does not open.
func (n *Namespace) openNoteKey(ctx context.Context, req *websocket.Request, password string) ([]byte, error) {
	if err := n.passwordLocked(req); err != nil {
		return nil, err
	}
	encryptedKey, err := n.repo.Users().GetNoteEncryptionKey(ctx, req.Client.UserID)
	if err != nil {
		return nil, err
	}
	key, err := encryption.OpenNoteKey(encryptedKey, password)
	switch {
	case errors.Is(err, encryption.ErrUnsupportedFormat):
		return nil, websocket.NewClientError(oldFormatMessage)
	case errors.Is(err, encryption.ErrDecrypt):
		n.passwordChecked(ctx, req, false)
		return nil, websocket.NewClientError(decryptMessage)
	case err != nil:
		return nil, err
	}
	n.passwordChecked(ctx, req, true)
	return key, nil
}

func (n *Namespace) verifyOwnPassword(ctx context.Context, req *websocket.Request) error {
	var msg messages.VerifyOwnPassword
	if err := req.Decode(&msg); err != nil {
		return err
	}

	verified, err := n.validatePassword(ctx, req, msg.Password)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.VerifyOwnPasswordResponse{
		Type:     messages.UsersVerifyOwnPasswordResponse,
		Verified: verified,
	})
}

func (n *Namespace) encryptText(ctx context.Context, req *websocket.Request) error {
	var msg messages.EncryptText
	if err := req.Decode(&msg); err != nil {
		return err
	}

	key, err := n.openNoteKey(ctx, req, msg.Password)
	if err != nil {
		return err
	}
	encrypted, err := encryption.EncryptNote(key, msg.Text)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.EncryptTextResponse{
		Type:      messages.UsersEncryptTextResponse,
		Encrypted: encrypted,
	})
}

// The key opened, so a value in an old format is a note noteme-upgrade
// could not convert (SF-41).
func (n *Namespace) decryptText(ctx context.Context, req *websocket.Request) error {
	var msg messages.DecryptText
	if err := req.Decode(&msg); err != nil {
		return err
	}

	key, err := n.openNoteKey(ctx, req, msg.Password)
	if err != nil {
		return err
	}
	text, err := encryption.DecryptNote(key, msg.Encrypted)
	switch {
	case errors.Is(err, encryption.ErrUnsupportedFormat):
		return websocket.NewClientError(unconvertedMessage)
	case errors.Is(err, encryption.ErrDecrypt):
		return websocket.NewClientError(decryptMessage)
	case err != nil:
		return err
	}

	return req.Respond(ctx, &messages.DecryptTextResponse{
		Type: messages.UsersDecryptTextResponse,
		Text: text,
	})
}
