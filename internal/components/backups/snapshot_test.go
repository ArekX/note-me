package backups

import (
	"context"
	"fmt"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"noteme/internal/components/database/databasetest"
	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
)

func TestSnapshotTablesCoverSchema(t *testing.T) {
	f := setup(t)
	rows, err := f.db.QueryContext(context.Background(),
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('sqlite_sequence', 'migration') ORDER BY name`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatal(err)
		}
		tables = append(tables, name)
	}
	if listed := slices.Sorted(slices.Values(snapshotTables)); !slices.Equal(tables, listed) {
		t.Errorf("snapshot tables = %v, schema tables = %v", listed, tables)
	}
}

func TestSnapshotRoundTrip(t *testing.T) {
	ctx := context.Background()
	source, databaseType := databasetest.Open(t)
	fillAllTables(t, source, sqlrepo.New(source, databaseType))

	root := t.TempDir()
	files := storage.New(filepath.Join(root, "temp"), filepath.Join(root, "files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(root, "backup.zip")
	if err := createArchive(ctx, source, databaseType, files, archive); err != nil {
		t.Fatal(err)
	}

	target, _ := databasetest.Open(t)
	targetRepo := sqlrepo.New(target, databaseType)
	stale, err := targetRepo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Stale", Username: "stale", Password: "password1", Role: "user"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := targetRepo.CreateNote(ctx, repository.NewNoteRecord{Title: "Stale", UserId: stale}); err != nil {
		t.Fatal(err)
	}

	if _, err := RestoreInto(ctx, archive, "", target, databaseType, files); err != nil {
		t.Fatal(err)
	}

	compareTables(t, source, target)

	// Moving between databases: the archive restores as a sqlite file, and a
	// backup of that file restores into this database type again.
	restoredPath := filepath.Join(root, "restored.sqlite")
	if _, err := Restore(ctx, archive, "", restoredPath, files); err != nil {
		t.Fatal(err)
	}
	restored, err := sqlite.Open(ctx, restoredPath)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	compareTables(t, source, restored)

	sqliteArchive := filepath.Join(root, "sqlite.zip")
	if err := createArchive(ctx, restored, "sqlite", files, sqliteArchive); err != nil {
		t.Fatal(err)
	}
	fromSqlite, _ := databasetest.Open(t)
	if _, err := RestoreInto(ctx, sqliteArchive, "", fromSqlite, databaseType, files); err != nil {
		t.Fatal(err)
	}
	compareTables(t, source, fromSqlite)

	note, err := targetRepo.CreateNote(ctx, repository.NewNoteRecord{Title: "After restore", UserId: 1})
	if err != nil {
		t.Fatalf("insert after restore: %v", err)
	}
	if note.Id <= 2 {
		t.Errorf("new note id = %d, the id sequence was not moved past the restored rows", note.Id)
	}
}

func compareTables(t *testing.T, want, got drivers.DB) {
	t.Helper()
	for _, table := range snapshotTables {
		wantRows, gotRows := dumpTable(t, want, table), dumpTable(t, got, table)
		if len(wantRows) == 0 {
			t.Errorf("%s has no rows to compare", table)
		}
		if table == sessionTable {
			if len(gotRows) != 0 {
				t.Errorf("sessions after restore = %v", gotRows)
			}
			continue
		}
		if !slices.Equal(gotRows, wantRows) {
			t.Errorf("%s after restore =\n%v\nwant\n%v", table, gotRows, wantRows)
		}
	}
}

func fillAllTables(t *testing.T, db drivers.DB, r *sqlrepo.Repository) {
	t.Helper()
	ctx := context.Background()
	must := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}

	owner, err := r.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Ówner", Username: "owner", Password: "password1", Role: "admin", Timezone: "Europe/Paris"})
	must(err)
	reader, err := r.CreateUserRecord(ctx, repository.NewUserRecord{Name: "Reader", Username: "reader", Password: "password1", Role: "user"})
	must(err)
	_, err = r.UpdateOnboardingState(ctx, owner, map[string]bool{"introduction_dismissed": true})
	must(err)

	child, err := r.CreateGroup(ctx, repository.NewGroupRecord{Name: "Child", UserId: owner})
	must(err)
	parent, err := r.CreateGroup(ctx, repository.NewGroupRecord{Name: "Parent", UserId: owner})
	must(err)
	must(r.UpdateGroup(ctx, owner, child.Id, repository.GroupUpdate{SetParent: true, ParentId: &parent.Id}))

	for _, title := range []string{"First", "Second"} {
		note, err := r.CreateNote(ctx, repository.NewNoteRecord{Title: title, Note: "text\nwith 'quotes' and ünïcode", UserId: owner, IsEncrypted: title == "Second"})
		must(err)
		must(r.AssignNoteToGroup(ctx, owner, note.Id, &child.Id))
		must(r.LinkNoteWithTags(ctx, owner, note.Id, []string{"work", title}))
		must(r.AddHistory(ctx, owner, note.Id, false))
		_, err = r.SetReminder(ctx, owner, note.Id, repository.Reminder{Once: true, NextAt: time.Now().Unix() + 3600})
		must(err)
		_, err = r.SetUserShare(ctx, owner, note.Id, []int64{int64(reader)})
		must(err)
		_, err = r.CreatePublicShare(ctx, note.Id, nil)
		must(err)
		_, err = r.CreateNotification(ctx, reader, fmt.Sprintf(`{"payload":{"id":%d}}`, note.Id))
		must(err)
	}

	must(r.CreateFileRecord(ctx, repository.NewFileRecord{Identifier: "file-1", Name: "a.png", UserId: owner, Size: 7, MimeType: "image/png"}))
	must(r.MarkFileReady(ctx, "file-1"))
	_, err = r.CreateNewSession(ctx, repository.NewSessionRecord{Key: "session-1", UserId: owner, ExpiresAt: time.Now().Add(time.Hour).UnixMilli(), Data: []byte(`{}`)})
	must(err)
	must(r.SavePeriodicTaskRun(ctx, repository.PeriodicTaskRun{TaskIdentifier: "backup-database", NextRunAt: 200, RanAt: 100, Successful: true}))
	_, err = r.CreateBackupTarget(ctx, repository.BackupTargetData{Name: "Local", Type: TypeLocal, Settings: `{"location":"/backups"}`})
	must(err)
	_, err = r.CreatePasskey(ctx, repository.NewPasskeyRecord{
		PasskeyCredential: repository.PasskeyCredential{CredentialId: "cred", PublicKey: []byte{0, 1, 2, 255}, Counter: 3, IsBackupEligible: true, Transports: "internal"},
		UserId:            owner,
		Name:              "Laptop",
	})
	must(err)
	must(r.SetPasskeyUserHandle(ctx, owner, "handle"))
	_, err = db.ExecContext(ctx, `INSERT INTO "audit_log" ("created_at", "event", "user_id", "username", "address", "details") VALUES (?, ?, ?, ?, ?, ?)`,
		100, "login_failed", owner, "owner", "127.0.0.1", `{"reason":"password"}`)
	must(err)

	key := "v2:sealed-key"
	provider, err := r.CreateProvider(ctx, repository.AIProviderData{Name: "Claude", Type: "claude", BaseURL: "https://api.anthropic.com", Model: "claude-test", APIKey: &key})
	must(err)
	must(r.SetDefaultProvider(ctx, &provider.Id))
	must(r.SetUserAccess(ctx, reader, false, nil))
	conversation, err := r.CreateConversation(ctx, repository.NewAIConversation{UserId: owner, ProviderId: provider.Id, ProviderName: "Claude", Model: "claude-test", Title: "Plan the week"})
	must(err)
	toolCalls, callId, toolName, status := `[{"id":"call-1","name":"get_tree","arguments":{}}]`, "call-1", "get_tree", "done"
	must(r.AppendMessages(ctx, conversation.Id, []repository.NewAIMessage{
		{Role: "user", Content: "Plan my week"},
		{Role: "assistant", ToolCalls: &toolCalls},
		{Role: "tool", Content: "{}", ToolCallId: &callId, ToolName: &toolName, ToolStatus: &status},
	}))

	clientId, secretHash := "client-1", "secret-hash"
	mcpClient, err := r.CreateClient(ctx, repository.NewMCPClient{UserId: owner, Name: "Claude", Kind: repository.MCPClientOAuth,
		ClientId: &clientId, ClientSecretHash: &secretHash, RedirectURIs: []string{"https://claude.ai/api/mcp/auth_callback"}, IsReadOnly: true})
	must(err)
	must(r.TouchClient(ctx, mcpClient.Id, 100))
	expiresAt := time.Now().Unix() + 3600
	refresh, err := r.CreateToken(ctx, repository.NewMCPToken{ClientId: mcpClient.Id, Kind: repository.MCPTokenRefresh, TokenHash: "refresh-hash", TokenPrefix: "nmcpr", ExpiresAt: &expiresAt})
	must(err)
	_, err = r.RotateRefreshToken(ctx, refresh.Id, 100)
	must(err)
}

func TestRestoreIntoRefusesAnArchiveWithoutOurColumns(t *testing.T) {
	ctx := context.Background()
	target, databaseType := databasetest.Open(t)
	root := t.TempDir()
	files := storage.New(filepath.Join(root, "temp"), filepath.Join(root, "files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}
	database := sqliteBytes(t, func(ctx context.Context, db drivers.DB) {
		if _, err := db.ExecContext(ctx, `ALTER TABLE "user" DROP COLUMN "timezone"`); err != nil {
			t.Fatal(err)
		}
	})
	archive := filepath.Join(root, "old.zip")
	writeZip(t, archive, map[string]string{"manifest.json": `{"format":1}`, "database.sqlite": database})

	_, err := RestoreInto(ctx, archive, "", target, databaseType, files)
	if err == nil || !strings.Contains(err.Error(), "table user has no column timezone") {
		t.Errorf("restore of a database without the column = %v", err)
	}
}

// Rows as text, so values compare the same whichever database and driver
// return them.
func dumpTable(t *testing.T, db drivers.DB, table string) []string {
	t.Helper()
	rows, err := db.QueryContext(context.Background(), `SELECT * FROM "`+table+`" ORDER BY "id"`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	columns, err := rows.Columns()
	if err != nil {
		t.Fatal(err)
	}

	var dump []string
	values := make([]any, len(columns))
	targets := make([]any, len(columns))
	for i := range values {
		targets[i] = &values[i]
	}
	for rows.Next() {
		if err := rows.Scan(targets...); err != nil {
			t.Fatal(err)
		}
		fields := make([]string, len(values))
		for i, value := range values {
			switch v := value.(type) {
			case nil:
				fields[i] = "NULL"
			case bool:
				fields[i] = map[bool]string{false: "0", true: "1"}[v]
			case []byte:
				fields[i] = string(v)
			default:
				fields[i] = fmt.Sprint(v)
			}
			fields[i] = columns[i] + "=" + fields[i]
		}
		dump = append(dump, strings.Join(fields, " "))
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	return dump
}
