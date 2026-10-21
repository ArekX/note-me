package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"testing/fstest"

	"noteme/internal/components/loginguard"
	"noteme/internal/components/passkeys"
	"noteme/internal/components/passkeys/passkeystest"
)

func postFrom(srv *Server, path, body, remoteAddr, forwardedFor string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	req.RemoteAddr = remoteAddr
	if forwardedFor != "" {
		req.Header.Set("X-Forwarded-For", forwardedFor)
	}
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func registerAdminPasskey(t *testing.T, srv *Server) *passkeystest.Authenticator {
	t.Helper()
	ctx := context.Background()
	account := passkeys.Account{ID: 1, Username: "admin", Name: "Administrator"}
	options, err := srv.components.Passkeys.BeginRegistration(ctx, "session", account)
	if err != nil {
		t.Fatal(err)
	}
	authenticator := passkeystest.New(srv.components.Config.AppURL.String())
	response, err := authenticator.Register(options)
	if err != nil {
		t.Fatal(err)
	}
	if err := srv.components.Passkeys.FinishRegistration(ctx, "session", account, response); err != nil {
		t.Fatal(err)
	}
	return authenticator
}

type passkeyOptions struct {
	RequestID string          `json:"request_id"`
	Options   json.RawMessage `json:"options"`
}

func passkeyLoginOptions(t *testing.T, srv *Server) passkeyOptions {
	t.Helper()
	rec := post(srv, "/api/login/passkey/options", `{}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("options: %d %s", rec.Code, rec.Body.String())
	}
	var options passkeyOptions
	if err := json.Unmarshal(rec.Body.Bytes(), &options); err != nil {
		t.Fatal(err)
	}
	return options
}

func passkeyLoginBody(t *testing.T, requestID string, response json.RawMessage) string {
	t.Helper()
	body, err := json.Marshal(map[string]any{"request_id": requestID, "response": response})
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

func TestPasskeyLogin(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	authenticator := registerAdminPasskey(t, srv)

	options := passkeyLoginOptions(t, srv)
	var request struct {
		RPID             string `json:"rpId"`
		UserVerification string `json:"userVerification"`
		AllowCredentials []any  `json:"allowCredentials"`
	}
	if err := json.Unmarshal(options.Options, &request); err != nil {
		t.Fatal(err)
	}
	if options.RequestID == "" || request.RPID != "localhost" || request.UserVerification != "preferred" || len(request.AllowCredentials) != 0 {
		t.Errorf("options = %s %s", options.RequestID, options.Options)
	}

	response, err := authenticator.Login(options.Options)
	if err != nil {
		t.Fatal(err)
	}
	body := passkeyLoginBody(t, options.RequestID, response)
	rec := post(srv, "/api/login/passkey", body, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("passkey login: %d %s", rec.Code, rec.Body.String())
	}
	session := getWithCookies(srv, "/api/session", rec.Result().Cookies())
	if session.Code != http.StatusOK || session.Body.String() != rec.Body.String() {
		t.Errorf("session after passkey login = %d %s", session.Code, session.Body.String())
	}

	again := post(srv, "/api/login/passkey", body, nil)
	if again.Code != http.StatusBadRequest || !strings.Contains(again.Body.String(), "Passkey sign in has expired, please try again.") {
		t.Errorf("reused request: %d %s", again.Code, again.Body.String())
	}

	if rec := post(srv, "/api/login/passkey", `{"request_id":""}`, nil); rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "Invalid passkey request.") {
		t.Errorf("invalid body: %d %s", rec.Code, rec.Body.String())
	}

	stranger := passkeystest.New(srv.components.Config.AppURL.String())
	stranger.UserHandle = []byte("stranger")
	options = passkeyLoginOptions(t, srv)
	response, _ = stranger.Login(options.Options)
	rec = post(srv, "/api/login/passkey", passkeyLoginBody(t, options.RequestID, response), nil)
	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), "make sure it is registered to your account") {
		t.Errorf("unknown passkey: %d %s", rec.Code, rec.Body.String())
	}
}

func TestLoginRateLimit(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	wrong := `{"username":"admin","password":"wrong"}`

	for i := range 30 {
		if rec := postFrom(srv, "/api/login", wrong, "203.0.113.1:1000", ""); rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: %d %s", i+1, rec.Code, rec.Body.String())
		}
	}
	for _, path := range []string{"/api/login", "/api/login/passkey/options", "/api/login/passkey"} {
		rec := postFrom(srv, path, `{"username":"admin","password":"admin"}`, "203.0.113.1:1000", "")
		if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), loginguard.LockedMessage) {
			t.Errorf("%s while locked: %d %s", path, rec.Code, rec.Body.String())
		}
	}
	if rec := postFrom(srv, "/api/login", `{"username":"admin","password":"admin"}`, "203.0.113.2:1000", ""); rec.Code != http.StatusOK {
		t.Errorf("other address: %d %s", rec.Code, rec.Body.String())
	}
}

func TestLoginRateLimitResetsOnSuccess(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	wrong := `{"username":"admin","password":"wrong"}`

	for range 29 {
		postFrom(srv, "/api/login", wrong, "203.0.113.1:1000", "")
	}
	if rec := postFrom(srv, "/api/login", `{"username":"admin","password":"admin"}`, "203.0.113.1:1000", ""); rec.Code != http.StatusOK {
		t.Fatalf("login: %d %s", rec.Code, rec.Body.String())
	}
	for i := range 30 {
		if rec := postFrom(srv, "/api/login", wrong, "203.0.113.1:1000", ""); rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d after reset: %d", i+1, rec.Code)
		}
	}
}

func TestLoginRateLimitBehindTrustedProxy(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	srv.components.Config.TrustedProxies = []netip.Prefix{netip.MustParsePrefix("10.0.0.1/32")}
	wrong := `{"username":"admin","password":"wrong"}`

	for range 31 {
		postFrom(srv, "/api/login", wrong, "10.0.0.1:80", "203.0.113.1")
	}
	if rec := postFrom(srv, "/api/login", wrong, "10.0.0.1:80", "203.0.113.1"); rec.Code != http.StatusForbidden {
		t.Errorf("locked client behind proxy: %d", rec.Code)
	}
	if rec := postFrom(srv, "/api/login", wrong, "10.0.0.1:80", "203.0.113.2"); rec.Code != http.StatusUnauthorized {
		t.Errorf("other client behind proxy: %d", rec.Code)
	}
	// Spoofed header from an untrusted peer is ignored.
	for range 31 {
		postFrom(srv, "/api/login", wrong, "198.51.100.7:80", "203.0.113.3")
	}
	if rec := postFrom(srv, "/api/login", wrong, "10.0.0.1:80", "203.0.113.3"); rec.Code != http.StatusUnauthorized {
		t.Errorf("spoofed address was locked: %d", rec.Code)
	}
}
