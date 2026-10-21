package passkeys_test

import (
	"context"
	"errors"
	"net/url"
	"path/filepath"
	"testing"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/passkeys"
	"noteme/internal/components/passkeys/passkeystest"
	"noteme/internal/components/repository"
)

const origin = "https://notes.example.com"

type fixture struct {
	repo     repository.Repository
	passkeys *passkeys.Passkeys
	db       drivers.DB
}

func setup(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	db, err := sqlite.Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	repo := sqlrepo.New(db, "sqlite")
	appURL, _ := url.Parse(origin)
	p := passkeys.New(appURL, repo)
	if err := p.Unavailable(); err != nil {
		t.Fatal(err)
	}
	return &fixture{repo: repo, passkeys: p, db: db}
}

func (f *fixture) account(t *testing.T, username string) passkeys.Account {
	t.Helper()
	id, err := f.repo.Users().CreateUserRecord(context.Background(), repository.NewUserRecord{
		Name: username, Username: username, Password: "password1", Role: "user", Timezone: "UTC",
	})
	if err != nil {
		t.Fatal(err)
	}
	return passkeys.Account{ID: id, Username: username, Name: username}
}

func (f *fixture) register(t *testing.T, sessionKey string, account passkeys.Account, authenticator *passkeystest.Authenticator) error {
	t.Helper()
	ctx := context.Background()
	options, err := f.passkeys.BeginRegistration(ctx, sessionKey, account)
	if err != nil {
		t.Fatal(err)
	}
	response, err := authenticator.Register(options)
	if err != nil {
		t.Fatal(err)
	}
	return f.passkeys.FinishRegistration(ctx, sessionKey, account, response)
}

func (f *fixture) login(t *testing.T, authenticator *passkeystest.Authenticator) (int, error) {
	t.Helper()
	requestID, options, err := f.passkeys.BeginLogin()
	if err != nil {
		t.Fatal(err)
	}
	response, err := authenticator.Login(options)
	if err != nil {
		t.Fatal(err)
	}
	return f.passkeys.FinishLogin(context.Background(), requestID, response)
}

func TestRegisterAndLogin(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	account := f.account(t, "alice")
	phone := passkeystest.New(origin)

	options, err := f.passkeys.BeginRegistration(ctx, "session", account)
	if err != nil {
		t.Fatal(err)
	}
	selection := options.AuthenticatorSelection
	if selection.ResidentKey != "required" || selection.UserVerification != "preferred" || options.Attestation != "none" {
		t.Errorf("authenticator selection = %+v, attestation %q", selection, options.Attestation)
	}
	if options.RelyingParty.ID != "notes.example.com" || options.User.Name != "alice" {
		t.Errorf("relying party = %+v, user = %+v", options.RelyingParty, options.User)
	}
	response, err := phone.Register(options)
	if err != nil {
		t.Fatal(err)
	}
	if err := f.passkeys.FinishRegistration(ctx, "session", account, response); err != nil {
		t.Fatalf("FinishRegistration() = %v", err)
	}

	page, err := f.repo.Passkeys().FindUserPasskeys(ctx, account.ID, 1)
	if err != nil || page.Total != 1 || page.Results[0].Name != "Platform authenticator (built-in into OS)" || page.Results[0].Transports != "internal,hybrid" {
		t.Fatalf("passkeys = %+v, %v", page, err)
	}

	userID, err := f.login(t, phone)
	if err != nil || userID != account.ID {
		t.Fatalf("login = %d, %v", userID, err)
	}
	credentials, _ := f.repo.Passkeys().GetUserPasskeyCredentials(ctx, account.ID)
	if credentials[0].Counter != 1 || !credentials[0].IsBackupEligible || !credentials[0].IsBackedUp {
		t.Errorf("credential after login = %+v", credentials[0])
	}

	// A second authenticator gets the same user handle.
	key := passkeystest.New(origin)
	key.Transports = []string{"usb"}
	key.BackupEligible, key.BackupState = false, false
	if err := f.register(t, "session", account, key); err != nil {
		t.Fatal(err)
	}
	if string(key.UserHandle) != string(phone.UserHandle) {
		t.Error("user handle changed between registrations")
	}
	if userID, err := f.login(t, key); err != nil || userID != account.ID {
		t.Errorf("login with key = %d, %v", userID, err)
	}
}

func TestRegistrationIsSingleUseAndPerSession(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	account := f.account(t, "alice")
	phone := passkeystest.New(origin)

	options, err := f.passkeys.BeginRegistration(ctx, "session", account)
	if err != nil {
		t.Fatal(err)
	}
	response, _ := phone.Register(options)

	if err := f.passkeys.FinishRegistration(ctx, "other-session", account, response); !errors.Is(err, passkeys.ErrExpired) {
		t.Errorf("finish from another session = %v", err)
	}
	if err := f.passkeys.FinishRegistration(ctx, "session", account, []byte(`{}`)); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("malformed response = %v", err)
	}
	if err := f.passkeys.FinishRegistration(ctx, "session", account, response); !errors.Is(err, passkeys.ErrExpired) {
		t.Errorf("reused registration = %v", err)
	}
}

func TestRegistrationRefusals(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	alice := f.account(t, "alice")
	bob := f.account(t, "bob")

	notStored := passkeystest.New(origin)
	stored := false
	notStored.Discoverable = &stored
	if err := f.register(t, "session", alice, notStored); !errors.Is(err, passkeys.ErrNotDiscoverable) {
		t.Errorf("not discoverable = %v", err)
	}

	unreported := passkeystest.New(origin)
	unreported.Discoverable = nil
	if err := f.register(t, "session", alice, unreported); err != nil {
		t.Errorf("credProps not reported = %v", err)
	}

	if err := f.register(t, "session", bob, unreported); !errors.Is(err, passkeys.ErrAlreadyRegistered) {
		t.Errorf("credential of another account = %v", err)
	}

	wrongOrigin := passkeystest.New("https://evil.example.com")
	if err := f.register(t, "session", alice, wrongOrigin); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("wrong origin = %v", err)
	}

	if page, _ := f.repo.Passkeys().FindUserPasskeys(ctx, alice.ID, 1); page.Total != 1 {
		t.Errorf("alice has %d passkeys, want 1", page.Total)
	}
	if page, _ := f.repo.Passkeys().FindUserPasskeys(ctx, bob.ID, 1); page.Total != 0 {
		t.Errorf("bob has %d passkeys, want 0", page.Total)
	}
}

func TestLoginRefusals(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	account := f.account(t, "alice")

	unknown := passkeystest.New(origin)
	unknown.UserHandle = []byte("someone")
	if _, err := f.login(t, unknown); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("unknown passkey = %v", err)
	}

	phone := passkeystest.New(origin)
	if err := f.register(t, "session", account, phone); err != nil {
		t.Fatal(err)
	}

	requestID, options, _ := f.passkeys.BeginLogin()
	response, _ := phone.Login(options)
	if _, err := f.passkeys.FinishLogin(ctx, requestID, response); err != nil {
		t.Fatal(err)
	}
	if _, err := f.passkeys.FinishLogin(ctx, requestID, response); !errors.Is(err, passkeys.ErrExpired) {
		t.Errorf("reused request = %v", err)
	}

	phone.FreezeCounter = true
	if _, err := f.login(t, phone); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("counter that did not increase = %v", err)
	}

	phone.Origin = "https://evil.example.com"
	if _, err := f.login(t, phone); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("wrong origin = %v", err)
	}
	phone.Origin = origin

	phone.BackupEligible = false
	phone.BackupState = false
	phone.FreezeCounter = false
	if _, err := f.login(t, phone); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("changed backup eligibility = %v", err)
	}
	phone.BackupEligible = true

	for _, statement := range []string{`DELETE FROM "user_passkey" WHERE "user_id" = ?`, `DELETE FROM "user" WHERE "id" = ?`} {
		if _, err := f.db.ExecContext(ctx, statement, account.ID); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := f.login(t, phone); !errors.Is(err, passkeys.ErrVerification) {
		t.Errorf("deleted user = %v", err)
	}
}

// Synced passkeys (iCloud Keychain, Google, Bitwarden) always report 0.
func TestZeroCounterIsAccepted(t *testing.T) {
	f := setup(t)
	account := f.account(t, "alice")
	synced := passkeystest.New(origin)
	synced.FreezeCounter = true
	if err := f.register(t, "session", account, synced); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if _, err := f.login(t, synced); err != nil {
			t.Fatalf("login with counter 0 = %v", err)
		}
	}
}

func TestUserVerificationIsNotRequired(t *testing.T) {
	f := setup(t)
	account := f.account(t, "alice")
	key := passkeystest.New(origin)
	key.UserVerified = false
	if err := f.register(t, "session", account, key); err != nil {
		t.Fatalf("register without user verification = %v", err)
	}
	if _, err := f.login(t, key); err != nil {
		t.Errorf("login without user verification = %v", err)
	}
}

func TestPasswordConfirmation(t *testing.T) {
	f := setup(t)
	if f.passkeys.IsPasswordConfirmed("session") {
		t.Fatal("confirmed before confirming")
	}
	f.passkeys.ConfirmPassword("session")
	if !f.passkeys.IsPasswordConfirmed("session") || f.passkeys.IsPasswordConfirmed("other") {
		t.Error("confirmation is not per session")
	}
}

func TestUnavailableWithIPAddress(t *testing.T) {
	appURL, _ := url.Parse("http://192.168.1.10:8000")
	p := passkeys.New(appURL, nil)
	if err := p.Unavailable(); !errors.Is(err, passkeys.ErrUnavailable) {
		t.Fatalf("Unavailable() = %v", err)
	}
	if _, _, err := p.BeginLogin(); !errors.Is(err, passkeys.ErrUnavailable) {
		t.Errorf("BeginLogin() = %v", err)
	}
}

func TestDefaultName(t *testing.T) {
	for _, c := range []struct {
		transports []string
		want       string
	}{
		{[]string{"internal", "usb"}, "Hardware Security key"},
		{[]string{"hybrid", "internal"}, "Platform authenticator (built-in into OS)"},
		{[]string{"hybrid"}, "Hybrid authenticator"},
		{nil, "Passkey authenticator"},
	} {
		if got := passkeys.DefaultName(c.transports); got != c.want {
			t.Errorf("DefaultName(%v) = %q, want %q", c.transports, got, c.want)
		}
	}
}

// A flood of sign in options must not push out a ceremony in progress.
func TestLoginOptionsRefuseWhenFull(t *testing.T) {
	f := setup(t)
	first, _, err := f.passkeys.BeginLogin()
	if err != nil {
		t.Fatal(err)
	}
	for range passkeys.MaxPending - 1 {
		if _, _, err := f.passkeys.BeginLogin(); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := f.passkeys.BeginLogin(); !errors.Is(err, passkeys.ErrBusy) {
		t.Fatalf("BeginLogin() with a full store = %v, want ErrBusy", err)
	}
	if _, err := f.passkeys.FinishLogin(context.Background(), first, []byte(`{}`)); errors.Is(err, passkeys.ErrExpired) {
		t.Error("the first challenge was evicted")
	}
}
