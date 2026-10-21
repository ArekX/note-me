package http

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"noteme/internal/components/audit"
)

const testVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

func challenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

type oauthTest struct {
	*mcpTestServer
	cookies      []*http.Cookie
	clientID     string
	clientSecret string
	redirectURI  string
}

func newOAuthTest(t *testing.T) *oauthTest {
	t.Helper()
	m := newMCPTestServer(t)
	client, secret := m.createClient(t, 1, "oauth", false, "https://claude.ai/api/mcp/auth_callback", "http://127.0.0.1:1/callback")
	return &oauthTest{
		mcpTestServer: m,
		cookies:       loginAdmin(t, m.srv),
		clientID:      client["client_id"].(string),
		clientSecret:  secret,
		redirectURI:   "https://claude.ai/api/mcp/auth_callback",
	}
}

func (o *oauthTest) query(changes map[string]string) string {
	values := url.Values{
		"response_type":         {"code"},
		"client_id":             {o.clientID},
		"redirect_uri":          {o.redirectURI},
		"code_challenge":        {challenge(testVerifier)},
		"code_challenge_method": {"S256"},
		"state":                 {"xyz"},
		"resource":              {o.url + "/mcp"},
	}
	for key, value := range changes {
		if value == "" {
			values.Del(key)
		} else {
			values.Set(key, value)
		}
	}
	return values.Encode()
}

func (o *oauthTest) consent(t *testing.T, query string, allow bool, cookies []*http.Cookie) (*httptest.ResponseRecorder, *url.URL) {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"query": query, "allow": allow})
	rec := post(o.srv, "/api/oauth/consent", string(body), cookies)
	var result struct {
		RedirectURL string `json:"redirect_url"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil || result.RedirectURL == "" {
		return rec, nil
	}
	target, err := url.Parse(result.RedirectURL)
	if err != nil {
		t.Fatal(err)
	}
	return rec, target
}

func (o *oauthTest) code(t *testing.T) string {
	t.Helper()
	rec, target := o.consent(t, o.query(nil), true, o.cookies)
	if target == nil || target.Query().Get("code") == "" || target.Query().Get("state") != "xyz" {
		t.Fatalf("consent: %d %s", rec.Code, rec.Body.String())
	}
	return target.Query().Get("code")
}

func (o *oauthTest) token(form url.Values, basic bool) (*httptest.ResponseRecorder, map[string]any) {
	if basic {
		form.Del("client_secret")
	} else if !form.Has("client_secret") {
		form.Set("client_id", o.clientID)
		form.Set("client_secret", o.clientSecret)
	}
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if basic {
		req.SetBasicAuth(url.QueryEscape(o.clientID), url.QueryEscape(o.clientSecret))
	}
	rec := httptest.NewRecorder()
	o.srv.Handler().ServeHTTP(rec, req)
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return rec, body
}

func (o *oauthTest) exchange(code, verifier string) (*httptest.ResponseRecorder, map[string]any) {
	return o.token(url.Values{"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {o.redirectURI}, "code_verifier": {verifier}}, true)
}

func TestOAuthMetadata(t *testing.T) {
	o := newOAuthTest(t)

	rec := get(o.srv, "/.well-known/oauth-authorization-server")
	for _, want := range []string{`"authorization_endpoint":"` + o.url + `/oauth/authorize"`, `"token_endpoint":"` + o.url + `/oauth/token"`, `"code_challenge_methods_supported":["S256"]`, `"client_secret_basic"`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Errorf("authorization server metadata lacks %s: %s", want, rec.Body.String())
		}
	}
	for _, path := range []string{"/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-protected-resource"} {
		rec := get(o.srv, path)
		if !strings.Contains(rec.Body.String(), `"resource":"`+o.url+`/mcp"`) || !strings.Contains(rec.Body.String(), `"authorization_servers":["`+o.url+`"]`) {
			t.Errorf("%s = %d %s", path, rec.Code, rec.Body.String())
		}
	}
}

func TestOAuthAuthorize(t *testing.T) {
	o := newOAuthTest(t)

	if rec := get(o.srv, "/oauth/authorize?"+o.query(nil)); rec.Code != http.StatusOK || rec.Body.String() != "<html>app</html>" {
		t.Errorf("valid request: %d %s", rec.Code, rec.Body.String())
	}
	loopback := o.query(map[string]string{"redirect_uri": "http://127.0.0.1:51234/callback"})
	if rec := get(o.srv, "/oauth/authorize?"+loopback); rec.Code != http.StatusOK {
		t.Errorf("loopback on another port: %d", rec.Code)
	}

	for name, changes := range map[string]map[string]string{
		"unregistered redirect": {"redirect_uri": "https://evil.example/callback"},
		"loopback other path":   {"redirect_uri": "http://127.0.0.1:1/other"},
		"unknown client":        {"client_id": "nope"},
		"no client":             {"client_id": ""},
	} {
		req := httptest.NewRequest(http.MethodGet, "/oauth/authorize?"+o.query(changes), nil)
		req.Header.Set("Accept", "text/html")
		rec := httptest.NewRecorder()
		o.srv.Handler().ServeHTTP(rec, req)
		if location := rec.Header().Get("Location"); location != "/error/404" {
			t.Errorf("%s: %d, Location %q", name, rec.Code, location)
		}
	}

	for name, tc := range map[string]struct {
		changes map[string]string
		error   string
	}{
		"no challenge":   {map[string]string{"code_challenge": ""}, "invalid_request"},
		"plain method":   {map[string]string{"code_challenge_method": "plain"}, "invalid_request"},
		"token flow":     {map[string]string{"response_type": "token"}, "unsupported_response_type"},
		"wrong resource": {map[string]string{"resource": "https://other.example/mcp"}, "invalid_target"},
	} {
		rec := get(o.srv, "/oauth/authorize?"+o.query(tc.changes))
		target, _ := url.Parse(rec.Header().Get("Location"))
		if rec.Code != http.StatusFound || !strings.HasPrefix(target.String(), o.redirectURI) || target.Query().Get("error") != tc.error || target.Query().Get("state") != "xyz" {
			t.Errorf("%s: %d %s", name, rec.Code, target)
		}
	}
	if rec := get(o.srv, "/oauth/authorize?"+o.query(map[string]string{"resource": ""})); rec.Code != http.StatusOK {
		t.Errorf("without resource: %d", rec.Code)
	}
}

func TestOAuthConsent(t *testing.T) {
	o := newOAuthTest(t)

	if rec := getWithCookies(o.srv, "/api/oauth/consent?"+o.query(nil), nil); rec.Code != http.StatusUnauthorized {
		t.Errorf("signed out: %d %s", rec.Code, rec.Body.String())
	}
	if rec, _ := o.consent(t, o.query(nil), true, nil); rec.Code != http.StatusUnauthorized {
		t.Errorf("signed out consent: %d", rec.Code)
	}
	rec := getWithCookies(o.srv, "/api/oauth/consent?"+o.query(nil), o.cookies)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"client_name":"oauth-`) || !strings.Contains(rec.Body.String(), `"username":"admin"`) {
		t.Errorf("consent info: %d %s", rec.Code, rec.Body.String())
	}
	if rec := getWithCookies(o.srv, "/api/oauth/consent?"+o.query(map[string]string{"redirect_uri": "https://evil.example"}), o.cookies); rec.Code != http.StatusBadRequest {
		t.Errorf("bad redirect: %d", rec.Code)
	}

	_, target := o.consent(t, o.query(nil), false, o.cookies)
	if target == nil || target.Query().Get("error") != "access_denied" || target.Query().Get("code") != "" {
		t.Errorf("deny: %v", target)
	}
	o.code(t)
	if len(auditEvents(t, o.srv, audit.MCPConsentGiven)) != 1 {
		t.Error("consent not audited")
	}

	o.addUser(t, "bob", "admin")
	bob := post(o.srv, "/api/login", `{"username":"bob","password":"password123"}`, nil).Result().Cookies()
	if rec := getWithCookies(o.srv, "/api/oauth/consent?"+o.query(nil), bob); rec.Code != http.StatusForbidden {
		t.Errorf("another user's client: %d %s", rec.Code, rec.Body.String())
	}
}

func TestOAuthTokenFlow(t *testing.T) {
	o := newOAuthTest(t)

	if rec, body := o.exchange(o.code(t), "wrong-verifier-wrong-verifier-wrong-verifier"); rec.Code != http.StatusBadRequest || body["error"] != "invalid_grant" {
		t.Errorf("wrong verifier: %d %v", rec.Code, body)
	}
	code := o.code(t)
	wrongRedirect := url.Values{"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {"http://127.0.0.1:1/callback"}, "code_verifier": {testVerifier}}
	if rec, body := o.token(wrongRedirect, true); rec.Code != http.StatusBadRequest || body["error"] != "invalid_grant" {
		t.Errorf("other redirect URI: %d %v", rec.Code, body)
	}
	if rec, _ := o.exchange(code, testVerifier); rec.Code != http.StatusBadRequest {
		t.Errorf("code after a failed exchange: %d", rec.Code)
	}

	code = o.code(t)
	rec, tokens := o.exchange(code, testVerifier)
	if rec.Code != http.StatusOK || tokens["token_type"] != "Bearer" || tokens["expires_in"] != 3600.0 || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("exchange: %d %v", rec.Code, tokens)
	}
	if rec, body := o.exchange(code, testVerifier); rec.Code != http.StatusBadRequest || body["error"] != "invalid_grant" {
		t.Errorf("reused code: %d %v", rec.Code, body)
	}
	access, refresh := tokens["access_token"].(string), tokens["refresh_token"].(string)
	if resp := mcpRequest(t, o.url, access, nil); resp.StatusCode != http.StatusOK {
		t.Errorf("access token on /mcp: %d", resp.StatusCode)
	}
	if resp := mcpRequest(t, o.url, refresh, nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("refresh token on /mcp: %d", resp.StatusCode)
	}

	rec, renewed := o.token(url.Values{"grant_type": {"refresh_token"}, "refresh_token": {refresh}}, false)
	if rec.Code != http.StatusOK || renewed["refresh_token"] == refresh {
		t.Fatalf("refresh: %d %v", rec.Code, renewed)
	}
	if resp := mcpRequest(t, o.url, renewed["access_token"].(string), nil); resp.StatusCode != http.StatusOK {
		t.Errorf("renewed access token: %d", resp.StatusCode)
	}

	if rec, body := o.token(url.Values{"grant_type": {"refresh_token"}, "refresh_token": {refresh}}, true); rec.Code != http.StatusBadRequest || body["error"] != "invalid_grant" {
		t.Errorf("reused refresh token: %d %v", rec.Code, body)
	}
	if resp := mcpRequest(t, o.url, renewed["access_token"].(string), nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("tokens kept after refresh token reuse: %d", resp.StatusCode)
	}
	if len(auditEvents(t, o.srv, audit.MCPRefreshTokenReused)) != 1 {
		t.Error("refresh token reuse not audited")
	}

	if rec, body := o.token(url.Values{"grant_type": {"password"}}, true); rec.Code != http.StatusBadRequest || body["error"] != "unsupported_grant_type" {
		t.Errorf("password grant: %d %v", rec.Code, body)
	}
}

func TestOAuthClientAuthentication(t *testing.T) {
	o := newOAuthTest(t)

	wrong := url.Values{"grant_type": {"authorization_code"}, "client_id": {o.clientID}, "client_secret": {"nmcps_wrong"}}
	rec, body := o.token(wrong, false)
	if rec.Code != http.StatusUnauthorized || body["error"] != "invalid_client" {
		t.Errorf("wrong secret: %d %v", rec.Code, body)
	}
	if len(auditEvents(t, o.srv, audit.MCPClientAuthFailed)) != 1 {
		t.Error("failed client authentication not audited")
	}

	limited := false
	for range 40 {
		if rec, _ := o.token(wrong, false); rec.Code == http.StatusTooManyRequests {
			limited = true
			break
		}
	}
	if !limited {
		t.Error("wrong secrets are not rate limited")
	}
}
