package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"golang.org/x/crypto/bcrypt"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/encryption"
)

func exec(t *testing.T, db drivers.DB, statements ...string) {
	t.Helper()
	for _, statement := range statements {
		if _, err := db.ExecContext(context.Background(), statement); err != nil {
			t.Fatalf("%s: %v", statement, err)
		}
	}
}

func count(t *testing.T, db drivers.DB, query string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRowContext(context.Background(), query, args...).Scan(&n); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return n
}

func openDB(t *testing.T, path string) (drivers.DB, error) {
	t.Helper()
	return sqlite.Open(context.Background(), path)
}

func openOriginalDB(t *testing.T) drivers.DB {
	t.Helper()
	return openOriginalDBAt(t, filepath.Join(t.TempDir(), "database.sqlite"))
}

func openOriginalDBAt(t *testing.T, path string) drivers.DB {
	t.Helper()
	ctx := context.Background()

	db, err := openDB(t, path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })

	// The original app's schema, as the Deno app created it.
	originalSchema, err := os.ReadFile(filepath.Join("testdata", "original-schema.sql"))
	if err != nil {
		t.Fatal(err)
	}

	for _, statement := range []string{
		`CREATE TABLE "migration" ("name" varchar(255) not null primary key, "timestamp" varchar(255) not null)`,
		`CREATE TABLE "migration_lock" ("id" varchar(255) not null primary key, "is_locked" integer default 0 not null)`,
		`INSERT INTO migration_lock (id, is_locked) VALUES ('migration_lock', 0)`,
		string(originalSchema),
		`INSERT INTO migration (name, timestamp) VALUES ('20231216_162457_initdb', '2024-11-20T13:56:28.412Z')`,
		`INSERT INTO "user" (name, username, password, role, created_at, updated_at, encryption_key)
			VALUES ('Admin', 'admin', 'x', 'admin', 0, 0, 'key')`,
		`INSERT INTO "file" (identifier, name, user_id, size, data, mime_type, created_at, is_ready)
			VALUES ('907e3159-4039-4041-8c8d-0f03fc69cedf', 'a.png', 1, 4, X'89504E47', 'image/png', 0, 1),
			       ('b107621f-740d-492c-92ca-7c9b684de995', 'pending.bin', 1, 0, NULL, 'application/octet-stream', 0, 0)`,
		`INSERT INTO "user_passkey" (name, user_id, webauthn_user_identifier, credential_identifier, public_key, counter, is_backed_up, transports, created_at, last_used_at)
			VALUES ('Phone', 1, 'handle-a', 'cred-a', X'01', 0, 1, 'internal', 0, 0),
			       ('Key', 1, 'handle-b', 'cred-b', X'01', 3, 0, 'usb', 0, 0)`,
	} {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			t.Fatal(err)
		}
	}

	return db
}

func TestUpgrade(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)
	filesDir := filepath.Join(t.TempDir(), "nested", "files")

	for range 2 {
		if err := upgrade(ctx, db, filesDir, strings.NewReader(""), io.Discard); err != nil {
			t.Fatalf("upgrade() error = %v", err)
		}
	}

	var name string
	var executedAt int64
	if err := db.QueryRowContext(ctx, `SELECT name, executed_at FROM migration`).Scan(&name, &executedAt); err != nil {
		t.Fatal(err)
	}
	if name != "20231216_162457_initdb" || executedAt != 1732110988 {
		t.Errorf("migration row = (%q, %d)", name, executedAt)
	}

	var lockTables int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM sqlite_master WHERE name = 'migration_lock'`).Scan(&lockTables); err != nil {
		t.Fatal(err)
	}
	if lockTables != 0 {
		t.Error("migration_lock table was not dropped")
	}

	data, err := os.ReadFile(filepath.Join(filesDir, "907e3159-4039-4041-8c8d-0f03fc69cedf"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(data, []byte{0x89, 0x50, 0x4E, 0x47}) {
		t.Errorf("extracted data = %x", data)
	}
	entries, err := os.ReadDir(filesDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Errorf("files folder has %d entries, want 1", len(entries))
	}
	if fileColumns, err := columns(ctx, db, "file"); err != nil || fileColumns["data"] || !fileColumns["identifier"] {
		t.Errorf("file columns after upgrade = %v, %v", fileColumns, err)
	}
	for _, path := range []string{filesDir, filepath.Join(filesDir, "907e3159-4039-4041-8c8d-0f03fc69cedf")} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if want := map[bool]os.FileMode{true: 0o700, false: 0o600}[info.IsDir()]; info.Mode().Perm() != want {
			t.Errorf("%s mode = %o, want %o", path, info.Mode().Perm(), want)
		}
	}

	all, err := migrate.New(sqlite.NewMigrations(db)).All()
	if err != nil {
		t.Fatal(err)
	}
	fsys := fstest.MapFS{
		"migrations/" + all[0].Name + ".up.sql":    {Data: []byte(all[0].Up)},
		"migrations/20990101_000000_next.up.sql":   {Data: []byte(`CREATE TABLE "next" ("id" integer)`)},
		"migrations/20990101_000000_next.down.sql": {Data: []byte(`DROP TABLE "next"`)},
		"migrations/" + all[0].Name + ".down.sql":  {Data: []byte(all[0].Down)},
	}
	applied, err := migrate.NewWithFS(sqlite.NewMigrations(db), fsys).Up(ctx)
	if err != nil {
		t.Fatalf("migrate up after upgrade: %v", err)
	}
	if len(applied) != 1 || applied[0] != "20990101_000000_next" {
		t.Errorf("applied = %v, want only the new migration", applied)
	}
}

func TestUpgradeRemovesOldPasskeys(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)
	var out bytes.Buffer

	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "Removed 2 passkeys") {
		t.Errorf("output = %q", out.String())
	}
	var count int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM "user_passkey"`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("passkeys after upgrade = %d, %v", count, err)
	}

	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatalf("migrate up after upgrade: %v", err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO "user_passkey" (name, user_id, credential_identifier, public_key, counter, is_backup_eligible, is_backed_up, transports, created_at, last_used_at)
		VALUES ('New', 1, 'cred-new', X'01', 0, 1, 1, 'internal', 0, 0)`); err != nil {
		t.Fatal(err)
	}

	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), io.Discard); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM "user_passkey"`).Scan(&count); err != nil || count != 1 {
		t.Errorf("passkeys registered after the migration = %d, %v; want kept", count, err)
	}
}

func TestUpgradeRejectsUnknownDatabase(t *testing.T) {
	db, err := openDB(t, filepath.Join(t.TempDir(), "empty.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	if err := upgrade(context.Background(), db, t.TempDir(), strings.NewReader(""), io.Discard); err == nil {
		t.Fatal("upgrade() of a database without a migration table should fail")
	}
}

func TestUpgradeRejectsUnsafeIdentifier(t *testing.T) {
	ctx := context.Background()
	for _, identifier := range []string{"../escape", "nul", "a:b"} {
		db := openOriginalDB(t)
		if _, err := db.ExecContext(ctx, `UPDATE "file" SET identifier = ? WHERE id = 1`, identifier); err != nil {
			t.Fatal(err)
		}
		if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), io.Discard); err == nil {
			t.Errorf("upgrade() accepted the identifier %q", identifier)
		}
	}
}

func TestUpgradeAddsConstraints(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)
	exec(t, db,
		`INSERT INTO "user" (id, name, username, password, role, created_at, updated_at, encryption_key) VALUES (2, 'Jane', 'jane', 'x', 'user', 0, 0, 'key')`,
		`INSERT INTO "note" (id, title, note, user_id, created_at, updated_at) VALUES (1, 'a', '', 1, 0, 0), (2, 'b', '', 2, 0, 0), (3, 'c', '', 2, 0, 0)`,
		`INSERT INTO "note_tag" (id, name, user_id, created_at) VALUES (1, 'work', 1, 0), (2, 'home', 1, 0), (3, 'work', 2, 0), (4, 'work', 2, 0)`,
		`INSERT INTO "note_tag_note" (id, tag_id, note_id, created_at) VALUES (1, 1, 1, 0), (2, 3, 1, 0), (3, 3, 2, 0), (4, 4, 2, 0), (5, 4, 3, 0), (6, 2, 3, 0), (7, 2, 3, 0)`,
		`INSERT INTO "note_reminder" (id, note_id, user_id, next_at) VALUES (1, 1, 1, 10), (2, 1, 1, 20), (3, 2, 2, 30)`,
		`INSERT INTO "note_share_user" (id, note_id, user_id, created_at) VALUES (1, 1, 2, 0), (2, 1, 2, 0), (3, 2, 1, 0)`,
		`INSERT INTO "periodic_task_schedule" (id, task_identifier) VALUES (1, 'check-reminders'), (2, 'check-reminders'), (3, 'backup-database')`,
	)

	var out strings.Builder
	for range 2 {
		if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), &out); err != nil {
			t.Fatal(err)
		}
	}
	for _, want := range []string{"Removed 4 tag links moved to the surviving tag.", "Removed 3 duplicate tag links.", "Removed 2 duplicate tags.",
		"Removed 1 duplicate reminders.", "Removed 1 duplicate shares.", "Removed 1 duplicate task schedules.", "Added note_reminder_note_user_index"} {
		if strings.Count(out.String(), want) != 1 {
			t.Errorf("output does not contain %q once:\n%s", want, out.String())
		}
	}

	rows, err := db.QueryContext(ctx, `SELECT "tag_id", "note_id" FROM "note_tag_note" ORDER BY "id"`)
	if err != nil {
		t.Fatal(err)
	}
	var links []string
	for rows.Next() {
		var tag, note int
		rows.Scan(&tag, &note)
		links = append(links, fmt.Sprintf("%d-%d", tag, note))
	}
	rows.Close()
	if strings.Join(links, " ") != "1-1 1-2 1-3 2-3" {
		t.Errorf("tag links = %v", links)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM "note_tag" WHERE "id" IN (1, 2)`); n != 2 || count(t, db, `SELECT COUNT(*) FROM "note_tag"`) != 2 {
		t.Errorf("tags left = %d", n)
	}
	if n := count(t, db, `SELECT "id" FROM "note_reminder" WHERE "note_id" = 1`); n != 2 {
		t.Errorf("kept reminder = %d, want the newest", n)
	}
	if n := count(t, db, `SELECT "id" FROM "note_share_user" WHERE "note_id" = 1`); n != 1 {
		t.Errorf("kept share = %d, want the oldest", n)
	}
	if n := count(t, db, `SELECT "id" FROM "periodic_task_schedule" WHERE "task_identifier" = 'check-reminders'`); n != 1 {
		t.Errorf("kept schedule = %d, want the oldest", n)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM sqlite_master WHERE "name" IN ('note_tag_name_index', 'audit_log', 'audit_log_created_at_index')`); n != 3 {
		t.Errorf("constraints created = %d", n)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO "note_tag" (name, user_id, created_at) VALUES ('work', 1, 0)`); err == nil {
		t.Error("duplicate tag name accepted after the upgrade")
	}
	if n := count(t, db, `SELECT COUNT(*) FROM "note" WHERE "is_wide" = false`); n != 3 {
		t.Errorf("notes upgraded to normal width = %d, want 3", n)
	}
	exec(t, db, `INSERT INTO "note" (id, title, note, user_id, created_at, updated_at) VALUES (4, 'new', '', 1, 0, 0)`)
	if n := count(t, db, `SELECT COUNT(*) FROM "note" WHERE "id" = 4 AND "is_wide" = true`); n != 1 {
		t.Error("a note created after the upgrade is not wide")
	}
	if users := count(t, db, `SELECT COUNT(*) FROM "user"`); users == 0 || count(t, db, `SELECT COUNT(*) FROM "user" WHERE "preferred_editor" = 'rich'`) != users {
		t.Error("existing users do not prefer the rich editor after the upgrade")
	}
}

func TestUpgradeRemovesDeletedUsers(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)
	filesDir := filepath.Join(t.TempDir(), "files")
	exec(t, db,
		`INSERT INTO "user" (id, name, username, password, role, created_at, updated_at, encryption_key, is_deleted)
			VALUES (2, 'Gone', 'gone', 'x', 'user', 0, 0, 'key', true), (3, 'Jane', 'jane', 'x', 'user', 0, 0, 'key', false)`,
		`INSERT INTO "note" (id, title, note, user_id, created_at, updated_at) VALUES (1, 'gone', '', 2, 0, 0), (2, 'kept', '', 3, 0, 0)`,
		`INSERT INTO "note_tag" (id, name, user_id, created_at) VALUES (1, 'shared', 2, 0), (2, 'private', 2, 0)`,
		`INSERT INTO "note_tag_note" (tag_id, note_id, created_at) VALUES (1, 1, 0), (1, 2, 0), (2, 1, 0)`,
		`INSERT INTO "note_share_user" (note_id, user_id, created_at) VALUES (1, 3, 0), (2, 2, 0)`,
		`INSERT INTO "note_share_link" (identifier, note_id, created_at) VALUES ('link', 1, 0)`,
		`INSERT INTO "file" (identifier, name, user_id, size, data, mime_type, created_at, is_ready)
			VALUES ('gone-file', 'g.png', 2, 1, X'00', 'image/png', 0, 1)`,
		`INSERT INTO "session" (user_id, key, data, expires_at) VALUES (2, 'gone-session', '{}', 0)`,
		`INSERT INTO "group" (id, name, created_at, user_id) VALUES (1, 'Gone group', 0, 2)`,
	)

	var out strings.Builder
	for range 2 {
		if err := upgrade(ctx, db, filesDir, strings.NewReader(""), &out); err != nil {
			t.Fatal(err)
		}
	}
	if strings.Count(out.String(), "Removed 1 deleted users with 1 of their files.") != 1 {
		t.Errorf("output:\n%s", out.String())
	}
	for query, want := range map[string]int{
		`SELECT COUNT(*) FROM "user" WHERE "id" = 2`:                        0,
		`SELECT COUNT(*) FROM "note"`:                                       1,
		`SELECT COUNT(*) FROM "note_tag"`:                                   1,
		`SELECT "user_id" FROM "note_tag" WHERE "name" = 'shared'`:          1,
		`SELECT COUNT(*) FROM "note_tag_note"`:                              1,
		`SELECT COUNT(*) FROM "note_share_user"`:                            0,
		`SELECT COUNT(*) FROM "note_share_link"`:                            0,
		`SELECT COUNT(*) FROM "file"`:                                       2,
		`SELECT COUNT(*) FROM "session"`:                                    0,
		`SELECT COUNT(*) FROM "group"`:                                      0,
		`SELECT COUNT(*) FROM "user" WHERE "username" IN ('admin', 'jane')`: 2,
	} {
		if got := count(t, db, query); got != want {
			t.Errorf("%s = %d, want %d", query, got, want)
		}
	}
	if _, err := os.Stat(filepath.Join(filesDir, "gone-file")); !os.IsNotExist(err) {
		t.Errorf("deleted user's file: %v", err)
	}
	if _, err := os.Stat(filepath.Join(filesDir, "907e3159-4039-4041-8c8d-0f03fc69cedf")); err != nil {
		t.Errorf("admin's file: %v", err)
	}
}

func TestUpgradeReasonAfterEachStep(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)
	exec(t, db, `UPDATE "user" SET "password" = '$2a$10$3MdKC1.EeW0.5JgpC1o8m.0kr6Xqyx0bD5VyzD5L3SJxOgMBRHBwK', "encryption_key" = 'v2:x'`)
	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader("\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if applied, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil || len(applied) != 0 {
		t.Fatal(applied, err)
	}
	migrator := migrate.New(sqlite.NewMigrations(db))
	if reason, err := migrator.UpgradeReason(ctx); err != nil || reason != "" {
		t.Fatalf("after the upgrade: %q, %v", reason, err)
	}

	for name, setup := range map[string]struct{ change, undo string }{
		"old password":    {`UPDATE "user" SET "password" = '$2a$10$x' WHERE "id" = 1`, `UPDATE "user" SET "password" = '' WHERE "id" = 1`},
		"deleted user":    {`UPDATE "user" SET "is_deleted" = true WHERE "id" = 1`, `UPDATE "user" SET "is_deleted" = false WHERE "id" = 1`},
		"index":           {`DROP INDEX "note_tag_name_index"`, `CREATE UNIQUE INDEX "note_tag_name_index" ON "note_tag" ("name")`},
		"audit log":       {`DROP TABLE "audit_log"`, ``},
		"task runs":       {`DROP TABLE "periodic_task_run"`, ``},
		"AI tables":       {`DROP TABLE "ai_message"`, ``},
		"MCP tables":      {`DROP TABLE "mcp_token"`, ``},
		"note width":      {`ALTER TABLE "note" DROP COLUMN "is_wide"`, ``},
		"note editor":     {`ALTER TABLE "user" DROP COLUMN "preferred_editor"`, ``},
		"profile picture": {`ALTER TABLE "user" DROP COLUMN "profile_picture"`, ``},
	} {
		exec(t, db, setup.change)
		if reason, err := migrator.UpgradeReason(ctx); err != nil || reason == "" {
			t.Errorf("%s: reason = %q, %v", name, reason, err)
		}
		if setup.undo != "" {
			exec(t, db, setup.undo)
		} else if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), io.Discard); err != nil {
			t.Fatal(err)
		}
		if reason, err := migrator.UpgradeReason(ctx); err != nil || reason != "" {
			t.Errorf("%s undone: reason = %q, %v", name, reason, err)
		}
	}
}

// Produced by the original app's generateNoteEncryptionKey("password123")
// and encryptNote("Secret note ✓\nline two", key, "password123").
const (
	denoEncryptionKey = "kPrysJqv6DQ2A/F003pCNKYSH9cMA+xbVftr0VXB2eYM7qLkkhQk8gy8JAXghZaq5gNOrlVVpPOuyMWfyFOEGcmfxiaYFKb+X38eE6EL8MR1jXv/+iwe07CzFJyky5LR4+nV+8ClwP5WYdKo"
	denoEncryptedNote = "t6CulJzap2kZwN0P34Cx4GclmwOa50a+7Z0vhtOLxFbk+H5BkXuhGX8zRfrU3Iwaou57XsnJ0ey9mGXRLtseEO7HDyQ="
	denoNoteText      = "Secret note ✓\nline two"
	// Valid legacy layout encrypted with some other key.
	foreignEncryptedNote = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
)

func TestUpgradeUsers(t *testing.T) {
	ctx := context.Background()
	db := openOriginalDB(t)

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	for _, statement := range []struct {
		query string
		args  []any
	}{
		{`INSERT INTO "user" (id, name, username, password, role, created_at, updated_at, encryption_key)
			VALUES (2, 'Jane', 'jane', ?, 'user', 0, 0, ?)`, []any{string(hash), denoEncryptionKey}},
		{`INSERT INTO "note" (id, title, note, is_encrypted, user_id, created_at, updated_at)
			VALUES (1, 'secret', ?, true, 2, 0, 0), (2, 'plain', 'Plain text', false, 2, 0, 0)`, []any{denoEncryptedNote}},
		{`INSERT INTO "note_history" (id, note_id, version, title, tags, note, is_encrypted, created_at)
			VALUES (1, 1, '1', 'secret', '', ?, true, 0), (2, 1, '2', 'secret', '', ?, true, 0)`, []any{denoEncryptedNote, foreignEncryptedNote}},
	} {
		if _, err := db.ExecContext(ctx, statement.query, statement.args...); err != nil {
			t.Fatal(err)
		}
	}

	var out strings.Builder
	// Admin is skipped, jane gets a wrong password first.
	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader("\nwrong-password\npassword123\n"), &out); err != nil {
		t.Fatalf("upgrade() error = %v", err)
	}
	for _, want := range []string{
		"2 users have a password hash or a note encryption key in the old format.",
		`User "admin" (Admin): 0 protected notes, 0 protected history entries.`,
		"Skipped: the password was cleared, an administrator must set a new one in Settings → Users.",
		`User "jane" (Jane): 1 protected notes, 2 protected history entries.`,
		"Incorrect password.",
		"Re-hashed the password.",
		"Re-encrypted the note key and 2 protected entries.",
		"1 protected entries could not be decrypted",
		"1 users were skipped",
	} {
		if !strings.Contains(out.String(), want) {
			t.Errorf("output does not contain %q:\n%s", want, out.String())
		}
	}

	var encryptionKey, passwordHash string
	if err := db.QueryRowContext(ctx, `SELECT encryption_key, password FROM "user" WHERE id = 2`).Scan(&encryptionKey, &passwordHash); err != nil {
		t.Fatal(err)
	}
	if !encryption.IsPasswordHash(passwordHash) || !encryption.VerifyPassword(passwordHash, "password123") {
		t.Errorf("password hash after upgrade = %q", passwordHash)
	}
	var adminHash string
	var resetRequired bool
	if err := db.QueryRowContext(ctx, `SELECT password, is_password_reset_required FROM "user" WHERE id = 1`).Scan(&adminHash, &resetRequired); err != nil {
		t.Fatal(err)
	}
	if adminHash != "" || !resetRequired {
		t.Errorf("skipped user = %q, reset required %v", adminHash, resetRequired)
	}
	noteKey, err := encryption.OpenNoteKey(encryptionKey, "password123")
	if err != nil {
		t.Fatalf("open upgraded key: %v", err)
	}

	for _, row := range []struct{ query, want string }{
		{`SELECT note FROM "note" WHERE id = 1`, denoNoteText},
		{`SELECT note FROM "note_history" WHERE id = 1`, denoNoteText},
	} {
		var value string
		if err := db.QueryRowContext(ctx, row.query).Scan(&value); err != nil {
			t.Fatal(err)
		}
		text, err := encryption.DecryptNote(noteKey, value)
		if err != nil || text != row.want {
			t.Errorf("%s: decrypted %q, %v", row.query, text, err)
		}
	}

	for _, row := range []struct{ query, want string }{
		{`SELECT note FROM "note" WHERE id = 2`, "Plain text"},
		{`SELECT note FROM "note_history" WHERE id = 2`, foreignEncryptedNote},
		{`SELECT encryption_key FROM "user" WHERE id = 1`, "key"},
	} {
		var value string
		if err := db.QueryRowContext(ctx, row.query).Scan(&value); err != nil {
			t.Fatal(err)
		}
		if value != row.want {
			t.Errorf("%s = %q, want unchanged %q", row.query, value, row.want)
		}
	}

	out.Reset()
	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader("ignored\n"), &out); err != nil {
		t.Fatalf("second upgrade() error = %v", err)
	}
	if !strings.Contains(out.String(), `User "admin"`) || !strings.Contains(out.String(), "cleared by an earlier run") ||
		strings.Contains(out.String(), "Password (empty to skip)") || strings.Contains(out.String(), `User "jane"`) {
		t.Errorf("second run should only report the skipped user:\n%s", out.String())
	}

	// A converted password with a key that could not be converted is
	// verified with the new hash on the next run.
	exec(t, db, `UPDATE "user" SET "encryption_key" = 'legacy' WHERE id = 2`)
	out.Reset()
	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader("password123\n"), &out); err != nil {
		t.Fatalf("third upgrade() error = %v", err)
	}
	if !strings.Contains(out.String(), "the old note key could not be decrypted with this password; the protected notes of this user stay unreadable") {
		t.Errorf("third run:\n%s", out.String())
	}
}

// Tables, columns (order, type, not null, default, primary key) and indexes.
func schemaOf(t *testing.T, db drivers.DB) string {
	t.Helper()
	ctx := context.Background()
	var out strings.Builder
	rows, err := db.QueryContext(ctx, `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('sqlite_sequence', 'migration') ORDER BY name`)
	if err != nil {
		t.Fatal(err)
	}
	var tables []string
	for rows.Next() {
		var name string
		rows.Scan(&name)
		tables = append(tables, name)
	}
	rows.Close()

	for _, table := range tables {
		out.WriteString("table " + table + "\n")
		for _, query := range []string{
			`SELECT name || ' ' || type || ' ' || "notnull" || ' ' || COALESCE(dflt_value, '') || ' ' || pk FROM pragma_table_info(?)`,
			`SELECT il.name || ' ' || il."unique" || ' ' || group_concat(ii.name) FROM pragma_index_list(?) il JOIN pragma_index_info(il.name) ii GROUP BY il.name ORDER BY il.name`,
		} {
			rows, err := db.QueryContext(ctx, query, table)
			if err != nil {
				t.Fatal(err)
			}
			for rows.Next() {
				var line string
				rows.Scan(&line)
				out.WriteString("  " + line + "\n")
			}
			rows.Close()
		}
	}
	return out.String()
}

func TestUpgradedOriginalMatchesTheV2Schema(t *testing.T) {
	ctx := context.Background()
	original := openOriginalDB(t)
	if err := upgrade(ctx, original, t.TempDir(), strings.NewReader("\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if applied, err := migrate.New(sqlite.NewMigrations(original)).Up(ctx); err != nil || len(applied) != 0 {
		t.Fatalf("migrations after upgrade = %v, %v; want none pending", applied, err)
	}

	fresh, err := openDB(t, filepath.Join(t.TempDir(), "fresh.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer fresh.Close()
	if _, err := migrate.New(sqlite.NewMigrations(fresh)).Up(ctx); err != nil {
		t.Fatal(err)
	}

	if got, want := schemaOf(t, original), schemaOf(t, fresh); got != want {
		t.Errorf("upgraded schema differs from the v2 schema\n--- upgraded\n%s\n--- fresh\n%s", got, want)
	}
}

// A database made by an earlier Go build has the passkey migration recorded
// separately; v2 folds it into the one schema migration.
func TestUpgradeRemovesFoldedMigrations(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(t, filepath.Join(t.TempDir(), "go.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO migration (name, executed_at) VALUES ('20261019_123255_passkey_security', 0)`); err != nil {
		t.Fatal(err)
	}

	var out strings.Builder
	if err := upgrade(ctx, db, t.TempDir(), strings.NewReader(""), &out); err != nil {
		t.Fatal(err)
	}
	applied, err := migrate.New(sqlite.NewMigrations(db)).Applied(ctx)
	if err != nil || len(applied) != 1 || applied[0] != "20231216_162457_initdb" {
		t.Errorf("applied = %v, %v", applied, err)
	}
	if !strings.Contains(out.String(), "Removed 1 migration records") {
		t.Errorf("output = %q", out.String())
	}
}
