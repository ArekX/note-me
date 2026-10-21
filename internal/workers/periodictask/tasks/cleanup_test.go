package tasks

import (
	"context"
	"log/slog"
	"path/filepath"
	"testing"
	"time"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
)

func openTestDatabase(t *testing.T) (drivers.DB, *sqlrepo.Repository) {
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
	return db, sqlrepo.New(db, "sqlite")
}

func TestCleanupTempFolderRemovesStaleUploads(t *testing.T) {
	ctx := context.Background()
	db, repo := openTestDatabase(t)
	userID, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "a", Username: "a", Password: "password", Role: "admin", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	files := storage.New(filepath.Join(root, "temp"), filepath.Join(root, "files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}

	for _, identifier := range []string{"stale", "recent", "ready"} {
		if err := repo.CreateFileRecord(ctx, repository.NewFileRecord{Identifier: identifier, Name: identifier, UserId: userID, MimeType: "text/plain", Size: 1}); err != nil {
			t.Fatal(err)
		}
	}
	old := time.Now().Add(-7 * time.Hour).Unix()
	if _, err := db.ExecContext(ctx, `UPDATE "file" SET "created_at" = ? WHERE "identifier" IN ('stale', 'ready')`, old); err != nil {
		t.Fatal(err)
	}
	if err := repo.MarkFileReady(ctx, "ready"); err != nil {
		t.Fatal(err)
	}

	if err := (cleanupTempFolder{files, repo}).Trigger(ctx); err != nil {
		t.Fatal(err)
	}
	for identifier, want := range map[string]bool{"stale": false, "recent": true, "ready": true} {
		upload, err := repo.GetFileUploadForUser(ctx, userID, identifier)
		if err != nil {
			t.Fatal(err)
		}
		if (upload != nil) != want {
			t.Errorf("%s kept = %v, want %v", identifier, upload != nil, want)
		}
	}
}

func TestCleanupAuditLogKeepsOneYear(t *testing.T) {
	ctx := context.Background()
	db, repo := openTestDatabase(t)
	for _, event := range []string{"old", "recent"} {
		if err := repo.CreateAuditEntry(ctx, repository.AuditEntry{Event: event}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.ExecContext(ctx, `UPDATE "audit_log" SET "created_at" = ? WHERE "event" = 'old'`, time.Now().Add(-366*24*time.Hour).Unix()); err != nil {
		t.Fatal(err)
	}

	if err := (cleanupAuditLog{repo}).Trigger(ctx); err != nil {
		t.Fatal(err)
	}
	entries, err := repo.FindAuditEntries(ctx, repository.AuditFilters{}, 1)
	if err != nil || entries.Total != 1 || entries.Results[0].Event != "recent" {
		t.Errorf("entries after cleanup = %+v, %v", entries, err)
	}
}

func TestRemoveExpiredMCPTokens(t *testing.T) {
	ctx := context.Background()
	_, repo := openTestDatabase(t)
	userID, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: "a", Username: "a", Password: "password", Role: "admin", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	client, err := repo.CreateClient(ctx, repository.NewMCPClient{UserId: userID, Name: "Claude", Kind: repository.MCPClientOAuth})
	if err != nil {
		t.Fatal(err)
	}
	expired, valid := time.Now().Add(-time.Minute).Unix(), time.Now().Add(time.Hour).Unix()
	for hash, expiresAt := range map[string]*int64{"expired": &expired, "valid": &valid, "no-expiry": nil} {
		if _, err := repo.CreateToken(ctx, repository.NewMCPToken{ClientId: client.Id, Kind: repository.MCPTokenAccess, TokenHash: hash, TokenPrefix: "nmcp", ExpiresAt: expiresAt}); err != nil {
			t.Fatal(err)
		}
	}

	if err := (removeExpiredMCPTokens{repo, slog.New(slog.DiscardHandler)}).Trigger(ctx); err != nil {
		t.Fatal(err)
	}
	for hash, want := range map[string]bool{"expired": false, "valid": true, "no-expiry": true} {
		token, err := repo.GetToken(ctx, hash)
		if err != nil {
			t.Fatal(err)
		}
		if (token != nil) != want {
			t.Errorf("%s kept = %v, want %v", hash, token != nil, want)
		}
	}
}
