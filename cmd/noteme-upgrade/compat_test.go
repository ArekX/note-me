package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/config"
	"noteme/internal/encryption"
	nhttp "noteme/internal/http"
	"noteme/internal/http/websocket/api"
	"noteme/internal/logger"
)

// Produced by https://deno.land/x/bcrypt@v0.4.1 (the original's hashSync)
// for "password123".
const denoPasswordHash = "$2a$10$3MdKC1.EeW0.5JgpC1o8m.0kr6Xqyx0bD5VyzD5L3SJxOgMBRHBwK"

// An original database as the Deno app leaves it (kysely migration table,
// bcrypt password, old encryption format, file blobs, a passkey, a backup
// target) goes through noteme-upgrade, then the Go server runs on it.
func TestUpgradedOriginalDatabaseRunsOnTheGoServer(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	databasePath := filepath.Join(root, "database.sqlite")
	filesDir := filepath.Join(root, "files")
	backupDir := filepath.Join(root, "backup")

	db := openOriginalDBAt(t, databasePath)
	for _, statement := range []struct {
		query string
		args  []any
	}{
		{`INSERT INTO "user" (id, name, username, password, role, timezone, created_at, updated_at, encryption_key, onboarding_state)
			VALUES (2, 'Jane', 'jane', ?, 'user', 'Europe/Belgrade', 0, 0, ?, '{"introduction_dismissed":true}')`, []any{denoPasswordHash, denoEncryptionKey}},
		{`INSERT INTO "note" (id, title, note, is_encrypted, user_id, created_at, updated_at)
			VALUES (1, 'secret', ?, true, 2, 0, 0)`, []any{denoEncryptedNote}},
		{`INSERT INTO "group_note" (note_id, group_id, user_id) VALUES (1, NULL, 2)`, nil},
		{`UPDATE "file" SET user_id = 2 WHERE id = 1`, nil},
		{`INSERT INTO "user_passkey" (name, user_id, webauthn_user_identifier, credential_identifier, public_key, counter, is_backed_up, transports, created_at, last_used_at)
			VALUES ('Phone', 2, 'handle', 'cred', X'01', 0, 1, 'internal', 0, 0)`, nil},
		{`INSERT INTO "backup_target" (name, type, settings, created_at, updated_at)
			VALUES ('Local', 'local', ?, 0, 0)`, []any{`{"location":"local"}`}},
	} {
		if _, err := db.ExecContext(ctx, statement.query, statement.args...); err != nil {
			t.Fatal(err)
		}
	}

	// Admin has no legacy notes to keep; jane gives her password.
	if err := upgrade(ctx, db, filesDir, strings.NewReader("\npassword123\n"), io.Discard); err != nil {
		t.Fatalf("upgrade() = %v", err)
	}
	db.Close()

	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	cfg.DatabaseType = "sqlite"
	cfg.DatabaseDsn = databasePath
	cfg.FilesDir = filesDir
	cfg.TempDir = filepath.Join(root, "temp")
	cfg.BackupDir = backupDir
	cfg.BackupEncryptionKey = "backup-key"
	log := logger.New(logger.Options{Level: "ERROR", Output: io.Discard})
	c, err := components.New(ctx, log, nil, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Cleanup()
	if err := c.Initialize(ctx); err != nil {
		t.Fatalf("migrations on the upgraded database: %v", err)
	}
	if err := c.Storage.Init(); err != nil {
		t.Fatal(err)
	}

	var migrations int
	if err := c.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM migration WHERE name = '20231216_162457_initdb'`).Scan(&migrations); err != nil || migrations != 1 {
		t.Errorf("schema migration recorded = %d, %v", migrations, err)
	}
	var passkeys int
	c.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM "user_passkey"`).Scan(&passkeys)
	if passkeys != 0 {
		t.Errorf("old passkeys left: %d", passkeys)
	}
	var hash string
	if err := c.DB.QueryRowContext(ctx, `SELECT "password" FROM "user" WHERE "username" = 'jane'`).Scan(&hash); err != nil || !encryption.IsPasswordHash(hash) {
		t.Errorf("password hash after upgrade = %q, %v", hash, err)
	}
	if reason, err := c.Migrator.UpgradeReason(ctx); err != nil || reason != "" {
		t.Errorf("UpgradeReason after upgrade = %q, %v", reason, err)
	}

	server := httptest.NewServer(nhttp.New(c, log, fstest.MapFS{}, api.NewHub(c)).Handler())
	defer server.Close()

	login, err := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(`{"username":"jane","password":"password123"}`))
	if err != nil {
		t.Fatal(err)
	}
	login.Body.Close()
	if login.StatusCode != http.StatusOK {
		t.Fatalf("login with the original password: %d", login.StatusCode)
	}
	var cookie string
	for _, c := range login.Cookies() {
		if c.Name == "session" {
			cookie = c.Name + "=" + c.Value
		}
	}

	request, _ := http.NewRequest(http.MethodGet, server.URL+"/file/907e3159-4039-4041-8c8d-0f03fc69cedf", nil)
	request.Header.Set("Cookie", cookie)
	file, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(file.Body)
	file.Body.Close()
	if file.StatusCode != http.StatusOK || string(data) != "\x89PNG" {
		t.Errorf("file from FILES_LOCATION: %d %x", file.StatusCode, data)
	}

	dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(dialCtx, "ws"+strings.TrimPrefix(server.URL, "http")+"/ws", &websocket.DialOptions{
		HTTPHeader: http.Header{"Cookie": []string{cookie}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	var encrypted string
	if err := c.DB.QueryRowContext(ctx, `SELECT note FROM "note" WHERE id = 1`).Scan(&encrypted); err != nil {
		t.Fatal(err)
	}
	message, _ := json.Marshal(map[string]string{"requestId": "r", "namespace": "users", "type": "decryptText", "encrypted": encrypted, "password": "password123"})
	if err := conn.Write(dialCtx, websocket.MessageText, message); err != nil {
		t.Fatal(err)
	}
	var reply map[string]any
	for reply["type"] != "decryptTextResponse" {
		_, raw, err := conn.Read(dialCtx)
		if err != nil {
			t.Fatalf("decrypt reply: %v", err)
		}
		reply = map[string]any{}
		json.Unmarshal(raw, &reply)
		if reply["type"] == "error" {
			t.Fatalf("decrypt = %v", reply)
		}
	}
	if reply["text"] != denoNoteText {
		t.Errorf("decrypted protected note = %q", reply["text"])
	}

	targets, err := c.Repository.BackupTargets().GetBackupTargets(ctx)
	if err != nil || len(targets) != 1 {
		t.Fatalf("backup targets = %v, %v", targets, err)
	}
	item, err := c.Backups.CreateManual(ctx, targets[0])
	if err != nil {
		t.Fatal(err)
	}
	backup, err := os.Open(filepath.Join(backupDir, "local", item.Identifier))
	if err != nil {
		t.Fatal(err)
	}
	defer backup.Close()
	plain, err := os.Create(filepath.Join(root, "plain.zip"))
	if err != nil {
		t.Fatal(err)
	}
	if err := encryption.DecryptFile(plain, backup, "backup-key"); err != nil {
		t.Fatalf("decrypt backup: %v", err)
	}
	plain.Close()
	archive, err := zip.OpenReader(plain.Name())
	if err != nil {
		t.Fatal(err)
	}
	defer archive.Close()
	var hasFile bool
	for _, entry := range archive.File {
		hasFile = hasFile || entry.Name == "files/907e3159-4039-4041-8c8d-0f03fc69cedf"
	}
	if !hasFile {
		t.Error("backup of the upgraded database lacks the extracted file")
	}
	if _, err := os.Stat(filepath.Join(filesDir, "907e3159-4039-4041-8c8d-0f03fc69cedf")); err != nil {
		t.Errorf("extracted file: %v", err)
	}
}
