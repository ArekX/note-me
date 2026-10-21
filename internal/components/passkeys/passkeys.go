package passkeys

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"noteme/internal/components/repository"
)

const (
	ceremonyTimeout = 5 * time.Minute
	// Sign in has no account to tie the challenge to, so it stays short.
	loginTimeout         = 2 * time.Minute
	passwordConfirmation = 5 * time.Minute
	MaxPending           = 10000
	userHandleSize       = 64
)

var (
	ErrUnavailable       = errors.New("passkeys are unavailable")
	ErrExpired           = errors.New("passkey request expired")
	ErrNotDiscoverable   = errors.New("passkey is not stored on the authenticator")
	ErrAlreadyRegistered = errors.New("passkey is already registered")
	ErrVerification      = errors.New("passkey verification failed")
	ErrBusy              = errors.New("too many passkey requests in progress")
)

type Account struct {
	ID       int
	Username string
	Name     string
}

type Passkeys struct {
	webauthn      *webauthn.WebAuthn
	unavailable   error
	repo          repository.Repository
	registrations *store[webauthn.SessionData]
	logins        *store[webauthn.SessionData]
	confirmations *store[struct{}]
}

// WebAuthn needs APP_URL to name a domain; with an IP address the rest of
// the app still runs and only passkeys are unavailable.
func New(appURL *url.URL, repo repository.Repository) *Passkeys {
	p := &Passkeys{
		repo:          repo,
		registrations: newStore[webauthn.SessionData](ceremonyTimeout, MaxPending),
		logins:        newStore[webauthn.SessionData](loginTimeout, MaxPending),
		confirmations: newStore[struct{}](passwordConfirmation, MaxPending),
	}

	timeout := webauthn.TimeoutConfig{Enforce: true, Timeout: ceremonyTimeout, TimeoutUVD: ceremonyTimeout}
	login := webauthn.TimeoutConfig{Enforce: true, Timeout: loginTimeout, TimeoutUVD: loginTimeout}
	requireResidentKey := true
	w, err := webauthn.New(&webauthn.Config{
		RPID:                  appURL.Hostname(),
		RPDisplayName:         "NoteMe",
		RPOrigins:             []string{(&url.URL{Scheme: appURL.Scheme, Host: appURL.Host}).String()},
		AttestationPreference: protocol.PreferNoAttestation,
		// Sign in asks for no username, so only passkeys the authenticator
		// stores itself can be offered there (decision 0.50).
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			ResidentKey:        protocol.ResidentKeyRequirementRequired,
			RequireResidentKey: &requireResidentKey,
			UserVerification:   protocol.VerificationPreferred,
		},
		Timeouts: webauthn.TimeoutsConfig{Login: login, Registration: timeout},
	})
	if err != nil {
		p.unavailable = fmt.Errorf("%w: %w", ErrUnavailable, err)
		return p
	}
	p.webauthn = w
	return p
}

func (p *Passkeys) Unavailable() error {
	return p.unavailable
}

func (p *Passkeys) ConfirmPassword(sessionKey string) error {
	return p.confirmations.put(sessionKey, struct{}{})
}

func (p *Passkeys) IsPasswordConfirmed(sessionKey string) bool {
	_, ok := p.confirmations.get(sessionKey)
	return ok
}

func (p *Passkeys) BeginRegistration(ctx context.Context, sessionKey string, account Account) (*protocol.PublicKeyCredentialCreationOptions, error) {
	if p.unavailable != nil {
		return nil, p.unavailable
	}

	u, err := p.loadUser(ctx, account, true)
	if err != nil {
		return nil, err
	}

	creation, session, err := p.webauthn.BeginRegistration(u,
		webauthn.WithExclusions(webauthn.Credentials(u.credentials).CredentialDescriptors()),
		webauthn.WithExtensions(webauthn.WithExtensionCredProps()),
	)
	if err != nil {
		return nil, fmt.Errorf("begin passkey registration: %w", err)
	}

	if err := p.registrations.put(sessionKey, *session); err != nil {
		return nil, err
	}
	return &creation.Response, nil
}

func (p *Passkeys) FinishRegistration(ctx context.Context, sessionKey string, account Account, response []byte) error {
	if p.unavailable != nil {
		return p.unavailable
	}

	session, ok := p.registrations.take(sessionKey)
	if !ok {
		return ErrExpired
	}

	parsed, err := protocol.ParseCredentialCreationResponseBytes(response)
	if err != nil {
		return verificationError(err)
	}

	u, err := p.loadUser(ctx, account, false)
	if err != nil {
		return err
	}

	credential, err := p.webauthn.CreateCredential(u, session, parsed)
	if err != nil {
		return verificationError(err)
	}

	// Browsers that do not report credProps leave it out; only an explicit
	// "not stored" is refused.
	if props := parsed.ClientExtensionResults.CredProps; props != nil && props.RK != nil && !*props.RK {
		return ErrNotDiscoverable
	}

	transports := make([]string, 0, len(credential.Transport))
	for _, transport := range credential.Transport {
		transports = append(transports, string(transport))
	}

	created, err := p.repo.Passkeys().CreatePasskey(ctx, repository.NewPasskeyRecord{
		PasskeyCredential: repository.PasskeyCredential{
			CredentialId:     encodeID(credential.ID),
			PublicKey:        credential.PublicKey,
			Counter:          int64(credential.Authenticator.SignCount),
			IsBackupEligible: credential.Flags.BackupEligible,
			IsBackedUp:       credential.Flags.BackupState,
			Transports:       strings.Join(transports, ","),
		},
		UserId: account.ID,
		Name:   DefaultName(transports),
	})
	if err != nil {
		return err
	}
	if !created {
		return ErrAlreadyRegistered
	}
	return nil
}

func (p *Passkeys) BeginLogin() (string, *protocol.PublicKeyCredentialRequestOptions, error) {
	if p.unavailable != nil {
		return "", nil, p.unavailable
	}

	assertion, session, err := p.webauthn.BeginDiscoverableLogin()
	if err != nil {
		return "", nil, fmt.Errorf("begin passkey login: %w", err)
	}

	requestID := uuid.NewString()
	if err := p.logins.put(requestID, *session); err != nil {
		return "", nil, err
	}
	return requestID, &assertion.Response, nil
}

// Returns the id of the user the passkey belongs to.
func (p *Passkeys) FinishLogin(ctx context.Context, requestID string, response []byte) (int, error) {
	if p.unavailable != nil {
		return 0, p.unavailable
	}

	session, ok := p.logins.take(requestID)
	if !ok {
		return 0, ErrExpired
	}

	parsed, err := protocol.ParseCredentialRequestResponseBytes(response)
	if err != nil {
		return 0, verificationError(err)
	}

	var login *repository.PasskeyLoginRecord
	var lookupErr error
	_, credential, err := p.webauthn.ValidatePasskeyLogin(func(rawID, _ []byte) (webauthn.User, error) {
		login, lookupErr = p.repo.Passkeys().GetPasskeyLogin(ctx, encodeID(rawID))
		if lookupErr != nil {
			return nil, lookupErr
		}
		if login == nil || login.UserHandle == "" {
			return nil, errors.New("unknown credential")
		}
		handle, err := base64.RawURLEncoding.DecodeString(login.UserHandle)
		if err != nil {
			return nil, err
		}
		stored, err := toCredential(login.PasskeyCredential)
		if err != nil {
			return nil, err
		}
		return &user{id: handle, credentials: []webauthn.Credential{stored}}, nil
	}, session, parsed)
	if lookupErr != nil {
		return 0, lookupErr
	}
	if err != nil {
		return 0, verificationError(err)
	}

	if credential.Authenticator.CloneWarning {
		return 0, fmt.Errorf("%w: signature counter did not increase, the authenticator may be cloned", ErrVerification)
	}

	if err := p.repo.Passkeys().UpdatePasskeyAfterUse(ctx, login.CredentialId, int64(credential.Authenticator.SignCount), credential.Flags.BackupState); err != nil {
		return 0, err
	}
	return login.UserId, nil
}

func DefaultName(transports []string) string {
	for _, name := range []struct{ transport, name string }{
		{"usb", "Hardware Security key"},
		{"nfc", "NFC device"},
		{"ble", "Bluetooth device"},
		{"internal", "Platform authenticator (built-in into OS)"},
		{"cable", "Cable authenticator"},
		{"hybrid", "Hybrid authenticator"},
		{"smart-card", "Smart card authenticator"},
	} {
		if slices.Contains(transports, name.transport) {
			return name.name
		}
	}
	return "Passkey authenticator"
}

func (p *Passkeys) loadUser(ctx context.Context, account Account, createHandle bool) (*user, error) {
	handle, err := p.repo.Passkeys().GetPasskeyUserHandle(ctx, account.ID)
	if err != nil {
		return nil, err
	}
	if handle == "" && createHandle {
		random := make([]byte, userHandleSize)
		_, _ = rand.Read(random)
		if err := p.repo.Passkeys().SetPasskeyUserHandle(ctx, account.ID, encodeID(random)); err != nil {
			return nil, err
		}
		if handle, err = p.repo.Passkeys().GetPasskeyUserHandle(ctx, account.ID); err != nil {
			return nil, err
		}
	}
	if handle == "" {
		return nil, ErrExpired
	}

	id, err := base64.RawURLEncoding.DecodeString(handle)
	if err != nil {
		return nil, fmt.Errorf("decode passkey user handle: %w", err)
	}

	records, err := p.repo.Passkeys().GetUserPasskeyCredentials(ctx, account.ID)
	if err != nil {
		return nil, err
	}
	credentials := make([]webauthn.Credential, 0, len(records))
	for _, record := range records {
		credential, err := toCredential(record)
		if err != nil {
			return nil, err
		}
		credentials = append(credentials, credential)
	}

	return &user{id: id, name: account.Username, displayName: account.Name, credentials: credentials}, nil
}

func toCredential(record repository.PasskeyCredential) (webauthn.Credential, error) {
	id, err := base64.RawURLEncoding.DecodeString(record.CredentialId)
	if err != nil {
		return webauthn.Credential{}, fmt.Errorf("decode passkey credential id: %w", err)
	}

	var transports []protocol.AuthenticatorTransport
	for transport := range strings.SplitSeq(record.Transports, ",") {
		if transport != "" {
			transports = append(transports, protocol.AuthenticatorTransport(transport))
		}
	}

	return webauthn.Credential{
		ID:        id,
		PublicKey: record.PublicKey,
		Transport: transports,
		Flags: webauthn.CredentialFlags{
			BackupEligible: record.IsBackupEligible,
			BackupState:    record.IsBackedUp,
		},
		Authenticator: webauthn.Authenticator{SignCount: uint32(record.Counter)},
	}, nil
}

func verificationError(err error) error {
	return fmt.Errorf("%w: %w", ErrVerification, err)
}

func encodeID(id []byte) string {
	return base64.RawURLEncoding.EncodeToString(id)
}

type user struct {
	id          []byte
	name        string
	displayName string
	credentials []webauthn.Credential
}

func (u *user) WebAuthnID() []byte                         { return u.id }
func (u *user) WebAuthnName() string                       { return u.name }
func (u *user) WebAuthnDisplayName() string                { return u.displayName }
func (u *user) WebAuthnCredentials() []webauthn.Credential { return u.credentials }
