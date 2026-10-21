package http

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	ws "github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/loginguard"
	"noteme/internal/components/repository"
	"noteme/internal/config"
	"noteme/internal/encryption"
	"noteme/internal/http/websocket"
	"noteme/internal/logger"
	"noteme/internal/timezone"
)

func newTestServer(t *testing.T, frontend fstest.MapFS) *Server {
	t.Helper()
	srv, _ := newTestServerWithHub(t, frontend)
	return srv
}

func newTestServerWithHub(t *testing.T, frontend fstest.MapFS) (*Server, *websocket.Hub) {
	t.Helper()
	return newTestServerWith(t, frontend, websocket.NewHub)
}

func newTestServerWith(t *testing.T, frontend fstest.MapFS, newHub func(*components.Components) *websocket.Hub) (*Server, *websocket.Hub) {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	cfg.DatabaseType = "sqlite"
	cfg.DatabaseDsn = ":memory:"
	cfg.TempDir = filepath.Join(t.TempDir(), "temp")
	cfg.FilesDir = filepath.Join(t.TempDir(), "files")
	cfg.BackupDir = filepath.Join(t.TempDir(), "backup")
	cfg.MaxPasswordAttempts = 3
	log := logger.New(logger.Options{Level: "ERROR", Output: io.Discard})
	c, err := components.New(context.Background(), log, nil, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Cleanup() })
	if err := c.Initialize(context.Background()); err != nil {
		t.Fatal(err)
	}
	if err := c.Storage.Init(); err != nil {
		t.Fatal(err)
	}
	hub := newHub(c)
	return New(c, log, frontend, hub), hub
}

func get(srv *Server, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestHealth(t *testing.T) {
	rec := get(newTestServer(t, fstest.MapFS{}), "/api/health")
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("unexpected response: %d %q", rec.Code, rec.Body.String())
	}
}

func TestSPAFallback(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{
		"index.html":    {Data: []byte("<html>app</html>")},
		"assets/app.js": {Data: []byte("console.log(1)")},
	})

	cases := map[string]int{
		"/":                   http.StatusOK,
		"/app/note/view-12":   http.StatusOK,
		"/assets/app.js":      http.StatusOK,
		"/api/does-not-exist": http.StatusNotFound,
	}
	for path, want := range cases {
		if rec := get(srv, path); rec.Code != want {
			t.Errorf("%s: status = %d, want %d", path, rec.Code, want)
		}
	}
	if rec := get(srv, "/app"); rec.Body.String() != "<html>app</html>" {
		t.Errorf("fallback body = %q", rec.Body.String())
	}
}

func TestFrontendNotBuilt(t *testing.T) {
	if rec := get(newTestServer(t, fstest.MapFS{}), "/app"); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", rec.Code)
	}
}

func post(srv *Server, path, body string, cookies []*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func getWithCookies(srv *Server, path string, cookies []*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func loginAdmin(t *testing.T, srv *Server) []*http.Cookie {
	t.Helper()
	rec := post(srv, "/api/login", `{"username":"admin","password":"admin"}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("login: status = %d %s", rec.Code, rec.Body.String())
	}
	return rec.Result().Cookies()
}

func TestBootstrapAdministrator(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})

	var role, userTimezone, encryptionKey string
	var resetRequired bool
	err := srv.components.DB.QueryRowContext(context.Background(),
		`SELECT role, timezone, encryption_key, is_password_reset_required FROM "user" WHERE username = 'admin'`,
	).Scan(&role, &userTimezone, &encryptionKey, &resetRequired)
	if err != nil {
		t.Fatal(err)
	}
	if role != "admin" || !resetRequired || !timezone.IsValid(userTimezone) {
		t.Errorf("admin = role %q, timezone %q, reset required %v", role, userTimezone, resetRequired)
	}
	if _, err := encryption.OpenNoteKey(encryptionKey, "admin"); err != nil {
		t.Errorf("admin encryption key does not open with the password: %v", err)
	}
}

func TestSessionRoute(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})

	if rec := get(srv, "/api/session"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("without cookie: status = %d, want 401", rec.Code)
	}

	loginRec := post(srv, "/api/login", `{"username":"admin","password":"admin"}`, nil)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login: status = %d %s", loginRec.Code, loginRec.Body.String())
	}

	rec := getWithCookies(srv, "/api/session", loginRec.Result().Cookies())
	if rec.Code != http.StatusOK {
		t.Fatalf("with cookie: status = %d %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != loginRec.Body.String() {
		t.Errorf("session body = %s, want login body %s", rec.Body.String(), loginRec.Body.String())
	}

	var body struct {
		User struct {
			OnboardingState map[string]bool `json:"onboarding_state"`
		} `json:"user"`
		RequiredSteps []string `json:"required_steps"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.User.OnboardingState == nil || len(body.RequiredSteps) != 1 || body.RequiredSteps[0] != "password_reset" {
		t.Errorf("session body = %s", rec.Body.String())
	}
}

func TestSessionCookieIsHostOnly(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})

	cookies := loginAdmin(t, srv)
	if len(cookies) != 1 || cookies[0].Name != "session" || cookies[0].Domain != "" {
		t.Fatalf("login cookies = %v", cookies)
	}

	stale := &http.Cookie{Name: "session", Value: "expired-session-of-the-original"}
	if rec := getWithCookies(srv, "/api/session", []*http.Cookie{stale, cookies[0]}); rec.Code != http.StatusOK {
		t.Errorf("stale cookie first: status = %d %s", rec.Code, rec.Body.String())
	}
}

func TestStepGate(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)

	rec := getWithCookies(srv, "/ws", cookies)
	want := `{"code":"step_required","error":"Required step must be completed first","step":"password_reset"}`
	if rec.Code != http.StatusForbidden || strings.TrimSpace(rec.Body.String()) != want {
		t.Errorf("/ws with pending step: %d %s", rec.Code, rec.Body.String())
	}
}

func TestProcessStep(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)

	step := func(data string) string {
		return `{"step":"password_reset","action":"change","data":` + data + `}`
	}

	cases := []struct {
		body, want string
	}{
		{`{"step":"unknown","action":"change"}`, `{"error":"Unknown step or action."}`},
		{`{"step":"password_reset","action":"unknown"}`, `{"error":"Unknown step or action."}`},
		{step(`{"old_password":"admin","new_password":"short","confirm_password":"short"}`),
			`{"error":"[{\"code\":\"too_small\",\"path\":[\"new_password\"],\"message\":\"Password must have at least 8 characters\"},` +
				`{\"code\":\"too_small\",\"path\":[\"confirm_password\"],\"message\":\"Password must have at least 8 characters\"},` +
				`{\"code\":\"custom\",\"path\":[\"new_password\"],\"message\":\"New password must match confirm password and must be at least 8 characters.\"},` +
				`{\"code\":\"custom\",\"path\":[\"confirm_password\"],\"message\":\"Confirm password must match new password and must be at least 8 characters.\"}]"}`},
		{step(`{"old_password":"admin","new_password":"password123","confirm_password":"password123","extra":1}`),
			`{"error":"[{\"code\":\"unrecognized_keys\",\"path\":[],\"message\":\"Unrecognized key: \\\"extra\\\"\"}]"}`},
		{step(`{"old_password":"password123","new_password":"password123","confirm_password":"password123"}`),
			`{"error":"New password must be different from the old password."}`},
		{step(`{"old_password":"wrong-password","new_password":"password123","confirm_password":"password123"}`),
			`{"error":"Old password is incorrect"}`},
	}
	for _, tc := range cases {
		rec := post(srv, "/api/process-step", tc.body, cookies)
		if rec.Code != http.StatusBadRequest || strings.TrimSpace(rec.Body.String()) != tc.want {
			t.Errorf("%s\n got  %d %s\n want 400 %s", tc.body, rec.Code, rec.Body.String(), tc.want)
		}
	}

	rec := post(srv, "/api/process-step", step(`{"old_password":"admin","new_password":"password123","confirm_password":"password123"}`), cookies)
	if rec.Code != http.StatusOK {
		t.Fatalf("change password: %d %s", rec.Code, rec.Body.String())
	}
	if session := getWithCookies(srv, "/api/session", cookies); session.Body.String() != rec.Body.String() {
		t.Errorf("process-step body = %s, want the session payload %s", rec.Body.String(), session.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"is_password_reset_required":false`) || !strings.Contains(rec.Body.String(), `"required_steps":[]`) {
		t.Errorf("session after change = %s", rec.Body.String())
	}

	if rec := getWithCookies(srv, "/ws", cookies); rec.Code == http.StatusForbidden {
		t.Errorf("/ws still gated after the step: %s", rec.Body.String())
	}

	again := post(srv, "/api/process-step", step(`{"old_password":"password123","new_password":"password456","confirm_password":"password456"}`), cookies)
	if again.Code != http.StatusBadRequest || strings.TrimSpace(again.Body.String()) != `{"error":"This step is not pending for the user."}` {
		t.Errorf("step after completion: %d %s", again.Code, again.Body.String())
	}

	var encryptionKey string
	if err := srv.components.DB.QueryRowContext(context.Background(),
		`SELECT encryption_key FROM "user" WHERE username = 'admin'`).Scan(&encryptionKey); err != nil {
		t.Fatal(err)
	}
	if _, err := encryption.OpenNoteKey(encryptionKey, "password123"); err != nil {
		t.Errorf("encryption key was not re-encrypted with the new password: %v", err)
	}
}

func changeAdminPassword(t *testing.T, srv *Server, cookies []*http.Cookie) {
	t.Helper()
	rec := post(srv, "/api/process-step", `{"step":"password_reset","action":"change","data":{"old_password":"admin","new_password":"password123","confirm_password":"password123"}}`, cookies)
	if rec.Code != http.StatusOK {
		t.Fatalf("change password: %d %s", rec.Code, rec.Body.String())
	}
}

func dialWebsocket(t *testing.T, url string, cookies []*http.Cookie) (*ws.Conn, *http.Response, error) {
	t.Helper()
	header := http.Header{}
	for _, cookie := range cookies {
		header.Add("Cookie", cookie.String())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, resp, err := ws.Dial(ctx, "ws"+strings.TrimPrefix(url, "http")+"/ws", &ws.DialOptions{HTTPHeader: header})
	if conn != nil {
		t.Cleanup(func() { conn.CloseNow() })
	}
	return conn, resp, err
}

func TestWebsocketRequiresSession(t *testing.T) {
	server := httptest.NewServer(newTestServer(t, fstest.MapFS{}).Handler())
	defer server.Close()

	if _, resp, err := dialWebsocket(t, server.URL, nil); err == nil || resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("without session: %v %v", resp, err)
	}
}

func TestSessionUpdatedCarriesSessionPayload(t *testing.T) {
	srv, hub := newTestServerWithHub(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)
	changeAdminPassword(t, srv, cookies)

	server := httptest.NewServer(srv.Handler())
	defer server.Close()
	conn, _, err := dialWebsocket(t, server.URL, cookies)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	if _, err := srv.components.DB.ExecContext(ctx, `UPDATE "user" SET role = 'user', onboarding_state = '{"introduction_dismissed":true}' WHERE username = 'admin'`); err != nil {
		t.Fatal(err)
	}
	if _, err := hub.RefreshUserSession(ctx, 1); err != nil {
		t.Fatal(err)
	}

	readCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, data, err := conn.Read(readCtx)
	if err != nil {
		t.Fatal(err)
	}
	var pushed map[string]any
	if err := json.Unmarshal(data, &pushed); err != nil {
		t.Fatal(err)
	}
	if pushed["namespace"] != "users" || pushed["type"] != "sessionUpdated" {
		t.Fatalf("pushed = %s", data)
	}
	delete(pushed, "requestId")
	delete(pushed, "namespace")
	delete(pushed, "type")

	var session map[string]any
	if err := json.Unmarshal(getWithCookies(srv, "/api/session", cookies).Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(pushed, session) {
		t.Errorf("sessionUpdated payload\n %v\nwant the /api/session payload\n %v", pushed, session)
	}
}

func TestPublicNote(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	ctx := context.Background()
	repo := srv.components.Repository

	note, err := repo.Notes().CreateNote(ctx, repository.NewNoteRecord{Title: "Plan", Note: "# Plan", UserId: 1})
	if err != nil {
		t.Fatal(err)
	}
	link, err := repo.Shares().CreatePublicShare(ctx, note.Id, nil)
	if err != nil {
		t.Fatal(err)
	}

	rec := get(srv, "/api/public/"+link.Identifier)
	want := `{"id":1,"title":"Plan","note":"# Plan","is_encrypted":false,"updated_at":` + strconv.FormatInt(note.UpdatedAt, 10) + `,"tags":[],"user_name":"Administrator"}`
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != want {
		t.Errorf("public note = %d %s", rec.Code, rec.Body.String())
	}

	if rec := get(srv, "/api/public/missing"); rec.Code != http.StatusNotFound || strings.TrimSpace(rec.Body.String()) != `{"error":"Note not found."}` {
		t.Errorf("missing = %d %s", rec.Code, rec.Body.String())
	}

	encrypted := true
	if err := repo.Notes().UpdateNote(ctx, 1, note.Id, repository.NoteUpdate{IsEncrypted: &encrypted}); err != nil {
		t.Fatal(err)
	}
	if rec := get(srv, "/api/public/"+link.Identifier); rec.Code != http.StatusForbidden || strings.TrimSpace(rec.Body.String()) != `{"error":"This note is protected by its owner and cannot be viewed."}` {
		t.Errorf("protected = %d %s", rec.Code, rec.Body.String())
	}
}

func storeTestFile(t *testing.T, srv *Server, userID int, identifier, name, mimeType, data string, public bool) {
	t.Helper()
	ctx := context.Background()
	repo := srv.components.Repository
	if err := repo.Files().CreateFileRecord(ctx, repository.NewFileRecord{Identifier: identifier, Name: name, UserId: userID, MimeType: mimeType, Size: int64(len(data))}); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(srv.components.Config.FilesDir, identifier), []byte(data), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := repo.Files().MarkFileReady(ctx, identifier); err != nil {
		t.Fatal(err)
	}
	if public {
		if err := repo.Files().UpdateFileRecord(ctx, identifier, true, nil); err != nil {
			t.Fatal(err)
		}
	}
}

func requestFile(srv *Server, path string, cookies []*http.Cookie, header http.Header) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	for key, values := range header {
		req.Header[key] = values
	}
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func TestFileRoute(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	ctx := context.Background()
	userID, err := srv.components.Repository.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "User", Username: "user", Password: "password123", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = srv.components.Repository.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "Other", Username: "other", Password: "password123", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	login := func(username, password string) []*http.Cookie {
		rec := post(srv, "/api/login", `{"username":"`+username+`","password":"`+password+`"}`, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("login %s: %d %s", username, rec.Code, rec.Body.String())
		}
		return rec.Result().Cookies()
	}
	userCookies := login("user", "password123")
	otherCookies := login("other", "password123")
	adminCookies := loginAdmin(t, srv)

	storeTestFile(t, srv, userID, "private-file", "notes.txt", "text/markdown", "private text", false)
	storeTestFile(t, srv, userID, "public-file", "photo.png", "image/png", "png-bytes", true)
	storeTestFile(t, srv, userID, "archive-file", "archive.zip", "application/zip", "zip", true)

	rec := requestFile(srv, "/file/private-file", userCookies, nil)
	wantHeaders := map[string]string{
		"Content-Type":        "text/plain",
		"Content-Disposition": `inline; filename="notes.txt"`,
		"Content-Length":      "12",
		"Cache-Control":       "private, no-store",
		"Etag":                "",
		"Accept-Ranges":       "bytes",
	}
	if rec.Code != http.StatusOK || rec.Body.String() != "private text" {
		t.Errorf("owner = %d %q", rec.Code, rec.Body.String())
	}
	for key, want := range wantHeaders {
		if got := rec.Header().Get(key); got != want {
			t.Errorf("%s = %q, want %q", key, got, want)
		}
	}

	if rec := requestFile(srv, "/file/private-file", adminCookies, nil); rec.Code != http.StatusOK {
		t.Errorf("admin = %d", rec.Code)
	}
	if rec := requestFile(srv, "/file/private-file", otherCookies, nil); rec.Code != http.StatusForbidden || strings.TrimSpace(rec.Body.String()) != `{"error":"You do not have access to this file."}` {
		t.Errorf("other user = %d %s", rec.Code, rec.Body.String())
	}
	if rec := requestFile(srv, "/file/private-file?download", nil, nil); rec.Code != http.StatusSeeOther || rec.Header().Get("Location") != "/?redirect=%2Ffile%2Fprivate-file%3Fdownload" {
		t.Errorf("anonymous private = %d %s", rec.Code, rec.Header().Get("Location"))
	}

	public := requestFile(srv, "/file/public-file", nil, nil)
	if public.Code != http.StatusOK || public.Header().Get("Cache-Control") != "public, max-age=604800, immutable" || public.Header().Get("Content-Disposition") != `inline; filename="photo.png"` {
		t.Errorf("anonymous public = %d %v", public.Code, public.Header())
	}
	if rec := requestFile(srv, "/file/public-file?download", nil, nil); rec.Header().Get("Content-Disposition") != `attachment; filename="photo.png"` {
		t.Errorf("download = %v", rec.Header())
	}
	if rec := requestFile(srv, "/file/archive-file", nil, nil); rec.Header().Get("Content-Disposition") != `attachment; filename="archive.zip"` {
		t.Errorf("not displayable = %v", rec.Header())
	}

	ranged := requestFile(srv, "/file/public-file", nil, http.Header{"Range": {"bytes=4-"}})
	if ranged.Code != http.StatusPartialContent || ranged.Body.String() != "bytes" || ranged.Header().Get("Content-Range") != "bytes 4-8/9" {
		t.Errorf("range = %d %q %v", ranged.Code, ranged.Body.String(), ranged.Header())
	}
	if rec := requestFile(srv, "/file/public-file", nil, http.Header{"If-None-Match": {`"public-file"`}}); rec.Code != http.StatusNotModified {
		t.Errorf("if-none-match = %d", rec.Code)
	}

	if rec := requestFile(srv, "/file/missing", nil, nil); rec.Code != http.StatusNotFound || strings.TrimSpace(rec.Body.String()) != `{"error":"Requested file not found."}` {
		t.Errorf("missing record = %d %s", rec.Code, rec.Body.String())
	}
	if err := os.Remove(filepath.Join(srv.components.Config.FilesDir, "public-file")); err != nil {
		t.Fatal(err)
	}
	if rec := requestFile(srv, "/file/public-file", nil, nil); rec.Code != http.StatusNotFound {
		t.Errorf("missing on disk = %d", rec.Code)
	}
}

func TestDownloadDataExport(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)
	changeAdminPassword(t, srv, cookies)

	const exportID = "0d9c2d1e-5b8e-4f1a-9c3b-7e2f1a6d4b58"
	for _, identifier := range []string{"missing", exportID, `a"b`} {
		if rec := getWithCookies(srv, "/api/data-export/"+identifier, cookies); rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "Export not found.") {
			t.Errorf("missing export %s: %d %s", identifier, rec.Code, rec.Body.String())
		}
	}
	if rec := get(srv, "/api/data-export/"+exportID); rec.Code != http.StatusUnauthorized {
		t.Errorf("without session: %d", rec.Code)
	}

	file, err := srv.components.Storage.CreateExportFile(1, exportID)
	if err != nil {
		t.Fatal(err)
	}
	file.WriteString("zipdata")
	file.Close()
	if rec := getWithCookies(srv, "/api/data-export/"+exportID, cookies); rec.Code != http.StatusNotFound {
		t.Errorf("unfinished export: %d", rec.Code)
	}
	if err := srv.components.Storage.FinishExportFile(1, exportID); err != nil {
		t.Fatal(err)
	}

	rec := getWithCookies(srv, "/api/data-export/"+exportID, cookies)
	if rec.Code != http.StatusOK || rec.Body.String() != "zipdata" {
		t.Fatalf("download: %d %q", rec.Code, rec.Body.String())
	}
	for header, want := range map[string]string{
		"Content-Type":        "application/zip",
		"Content-Disposition": `attachment; filename="` + exportID + `.zip"`,
		"Content-Length":      "7",
		"Cache-Control":       "no-cache",
	} {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}

	other, err := srv.components.Repository.Users().CreateUserRecord(context.Background(), repository.NewUserRecord{Name: "Other", Username: "other", Password: "password123", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false WHERE "id" = ?`, other); err != nil {
		t.Fatal(err)
	}
	otherLogin := post(srv, "/api/login", `{"username":"other","password":"password123"}`, nil)
	if otherLogin.Code != http.StatusOK {
		t.Fatalf("other login: %d", otherLogin.Code)
	}
	if rec := getWithCookies(srv, "/api/data-export/"+exportID, otherLogin.Result().Cookies()); rec.Code != http.StatusNotFound {
		t.Errorf("another user's export: %d", rec.Code)
	}
}

func TestDownloadBackup(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	ctx := context.Background()
	cookies := loginAdmin(t, srv)
	changeAdminPassword(t, srv, cookies)

	location := filepath.Join(srv.components.Config.BackupDir, "local")
	if err := os.MkdirAll(location, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(location, "manual-1.zip"), []byte("backupdata"), 0o600); err != nil {
		t.Fatal(err)
	}
	target, err := srv.components.Repository.BackupTargets().CreateBackupTarget(ctx, repository.BackupTargetData{Name: "Local", Type: "local", Settings: `{"location":"local"}`})
	if err != nil {
		t.Fatal(err)
	}
	url := func(identifier string, targetID int) string {
		return "/api/settings/download-backup?identifier=" + identifier + "&target_id=" + strconv.Itoa(targetID)
	}

	for name, c := range map[string]struct {
		path string
		code int
	}{
		"unsafe name":    {url("..", target.Id), http.StatusBadRequest},
		"missing target": {url("manual-1.zip", 999), http.StatusNotFound},
		"missing backup": {url("manual-2.zip", target.Id), http.StatusNotFound},
	} {
		if rec := getWithCookies(srv, c.path, cookies); rec.Code != c.code {
			t.Errorf("%s: %d %s", name, rec.Code, rec.Body.String())
		}
	}

	rec := getWithCookies(srv, url("manual-1.zip", target.Id), cookies)
	if rec.Code != http.StatusOK || rec.Body.String() != "backupdata" {
		t.Fatalf("download: %d %q", rec.Code, rec.Body.String())
	}
	for header, want := range map[string]string{
		"Content-Type":        "application/octet-stream",
		"Content-Disposition": `attachment; filename="manual-1.zip"`,
		"Content-Length":      "10",
		"Cache-Control":       "no-cache",
	} {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}

	if _, err := srv.components.Repository.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "User", Username: "plain", Password: "password123", Role: "user", Timezone: "UTC"}); err != nil {
		t.Fatal(err)
	}
	if _, err := srv.components.DB.ExecContext(ctx, `UPDATE "user" SET "is_password_reset_required" = false WHERE "username" = 'plain'`); err != nil {
		t.Fatal(err)
	}
	userLogin := post(srv, "/api/login", `{"username":"plain","password":"password123"}`, nil)
	if rec := getWithCookies(srv, url("manual-1.zip", target.Id), userLogin.Result().Cookies()); rec.Code != http.StatusForbidden {
		t.Errorf("user without permission: %d", rec.Code)
	}

	entries, err := srv.components.Repository.AuditLog().FindAuditEntries(ctx, repository.AuditFilters{Event: audit.BackupDownloaded}, 1)
	if err != nil || entries.Total != 1 || entries.Results[0].Username != "admin" || !strings.Contains(entries.Results[0].Details, `"identifier":"manual-1.zip"`) {
		t.Errorf("audit entries = %+v (%v)", entries, err)
	}
}

func auditEvents(t *testing.T, srv *Server, event string) []repository.AuditRecord {
	t.Helper()
	entries, err := srv.components.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{Event: event}, 1)
	if err != nil {
		t.Fatal(err)
	}
	return entries.Results
}

func TestLoginIsAudited(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})

	if rec := post(srv, "/api/login", `{"username":"admin","password":"nope"}`, nil); rec.Code != http.StatusUnauthorized {
		t.Fatalf("wrong password: %d", rec.Code)
	}
	failed := auditEvents(t, srv, audit.LoginFailed)
	if len(failed) != 1 || failed[0].UserId != nil || !strings.Contains(failed[0].Details, `"username":"admin"`) || strings.Contains(failed[0].Details, "nope") {
		t.Errorf("failed login entries = %+v", failed)
	}

	loginAdmin(t, srv)
	succeeded := auditEvents(t, srv, audit.LoginSucceeded)
	if len(succeeded) != 1 || succeeded[0].UserId == nil || *succeeded[0].UserId != 1 || succeeded[0].Username != "admin" || succeeded[0].Address == "" {
		t.Errorf("successful login entries = %+v", succeeded)
	}
}

func TestLogout(t *testing.T) {
	srv, _ := newTestServerWithHub(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)
	changeAdminPassword(t, srv, cookies)

	server := httptest.NewServer(srv.Handler())
	defer server.Close()
	conn, _, err := dialWebsocket(t, server.URL, cookies)
	if err != nil {
		t.Fatal(err)
	}

	rec := post(srv, "/api/logout", "", cookies)
	if rec.Code != http.StatusOK {
		t.Fatalf("logout: %d %s", rec.Code, rec.Body.String())
	}
	cleared := rec.Result().Cookies()
	if len(cleared) != 1 || cleared[0].Name != "session" || cleared[0].MaxAge != -1 {
		t.Errorf("logout cookies = %v", cleared)
	}
	if rec := getWithCookies(srv, "/api/session", cookies); rec.Code != http.StatusUnauthorized {
		t.Errorf("session after logout: %d", rec.Code)
	}

	readCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, data, err := conn.Read(readCtx)
	if err != nil || !strings.Contains(string(data), `"forceLogoutResponse"`) {
		t.Errorf("open connection got %s (%v), want forceLogoutResponse", data, err)
	}
	if _, _, err := conn.Read(readCtx); ws.CloseStatus(err) != ws.StatusPolicyViolation {
		t.Errorf("connection not closed: %v", err)
	}

	// A stale cookie is cleared as well (SF-33).
	stale := post(srv, "/api/logout", "", cookies)
	if stale.Code != http.StatusOK || len(stale.Result().Cookies()) != 1 || stale.Result().Cookies()[0].MaxAge != -1 {
		t.Errorf("logout without a session: %d %v", stale.Code, stale.Result().Cookies())
	}
	if entries := auditEvents(t, srv, audit.Logout); len(entries) != 1 || entries[0].Username != "admin" {
		t.Errorf("logout audit entries = %+v", entries)
	}
}

func TestProcessStepEndsOtherSessionsAndLocks(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	first := loginAdmin(t, srv)
	second := loginAdmin(t, srv)

	step := func(old string) string {
		return `{"step":"password_reset","action":"change","data":{"old_password":"` + old + `","new_password":"password123","confirm_password":"password123"}}`
	}
	tooLong := post(srv, "/api/process-step", step(strings.Repeat("x", 129)), first)
	if tooLong.Code != http.StatusBadRequest || !strings.Contains(tooLong.Body.String(), "Password must have at most 128 characters") {
		t.Errorf("too long password: %d %s", tooLong.Code, tooLong.Body.String())
	}

	if rec := post(srv, "/api/process-step", step("admin"), first); rec.Code != http.StatusOK {
		t.Fatalf("change password: %d %s", rec.Code, rec.Body.String())
	}
	if rec := getWithCookies(srv, "/api/session", first); rec.Code != http.StatusOK {
		t.Errorf("own session after the change: %d", rec.Code)
	}
	if rec := getWithCookies(srv, "/api/session", second); rec.Code != http.StatusUnauthorized {
		t.Errorf("other session after the change: %d", rec.Code)
	}
	if entries := auditEvents(t, srv, audit.PasswordChanged); len(entries) != 1 || entries[0].Username != "admin" {
		t.Errorf("password change audit entries = %+v", entries)
	}

	// Three wrong old passwords lock every password check for the user.
	if _, err := srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = true WHERE "id" = 1`); err != nil {
		t.Fatal(err)
	}
	locked := loginAdminWith(t, srv, "password123")
	for range 3 {
		if rec := post(srv, "/api/process-step", step("wrong"), locked); rec.Code != http.StatusBadRequest {
			t.Fatalf("wrong password: %d %s", rec.Code, rec.Body.String())
		}
	}
	rec := post(srv, "/api/process-step", `{"step":"password_reset","action":"change","data":{"old_password":"password123","new_password":"password456","confirm_password":"password456"}}`, locked)
	if rec.Code != http.StatusForbidden || strings.TrimSpace(rec.Body.String()) != `{"error":"`+loginguard.PasswordLockedMessage+`"}` {
		t.Errorf("locked: %d %s", rec.Code, rec.Body.String())
	}
	if entries := auditEvents(t, srv, audit.PasswordAttemptsLocked); len(entries) != 1 {
		t.Errorf("lock audit entries = %+v", entries)
	}
	// Signing in is not limited by the password lock.
	loginAdminWith(t, srv, "password123")
}

func loginAdminWith(t *testing.T, srv *Server, password string) []*http.Cookie {
	t.Helper()
	rec := post(srv, "/api/login", `{"username":"admin","password":"`+password+`"}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("login: status = %d %s", rec.Code, rec.Body.String())
	}
	return rec.Result().Cookies()
}

func TestBrowserNavigationErrorsShowTheErrorPage(t *testing.T) {
	srv := newTestServer(t, fstest.MapFS{})
	cookies := loginAdmin(t, srv)
	changeAdminPassword(t, srv, cookies)

	navigate := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)
		return rec
	}

	for path, want := range map[string]string{
		"/file/missing":            "/error/404",
		"/api/data-export/missing": "/error/404",
		"/api/settings/download-backup?identifier=..&target_id=1":     "/error/404",
		"/api/settings/download-backup?identifier=a.zip&target_id=99": "/error/404",
	} {
		rec := navigate(path)
		if rec.Code != http.StatusSeeOther || rec.Header().Get("Location") != want {
			t.Errorf("%s: %d %q, want redirect to %s", path, rec.Code, rec.Header().Get("Location"), want)
		}
	}

	// API clients keep the JSON body.
	if rec := getWithCookies(srv, "/file/missing", cookies); rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "Requested file not found.") {
		t.Errorf("json client: %d %s", rec.Code, rec.Body.String())
	}
}
