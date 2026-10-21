package backups

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/config"
	"noteme/internal/encryption"
	"noteme/internal/logger"
)

const testKey = "backup-key"

type fixture struct {
	backups  *Backups
	repo     repository.Repository
	db       drivers.DB
	files    *storage.Storage
	root     string
	dbPath   string
	filesDir string
}

func setup(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	root := t.TempDir()
	dbPath := filepath.Join(root, "database.sqlite")
	db, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}

	filesDir := filepath.Join(root, "files")
	files := storage.New(filepath.Join(root, "temp"), filesDir)
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}
	repo := sqlrepo.New(db, "sqlite")
	cfg := &config.Config{
		TempDir: filepath.Join(root, "temp"), BackupDir: filepath.Join(root, "backup"), BackupEncryptionKey: testKey,
		MaxAllowedBackupCount: 2, DatabaseType: "sqlite", DatabaseDsn: dbPath,
	}
	return &fixture{
		backups:  New(db, repo, files, cfg, logger.New(logger.Options{Level: "ERROR", Output: io.Discard})),
		repo:     repo,
		db:       db,
		files:    files,
		root:     root,
		dbPath:   dbPath,
		filesDir: filesDir,
	}
}

func (f *fixture) localTarget(t *testing.T, name string) repository.BackupTarget {
	t.Helper()
	target, err := f.repo.BackupTargets().CreateBackupTarget(context.Background(), repository.BackupTargetData{
		Name: name, Type: TypeLocal, Settings: `{"location":"` + name + `"}`,
	})
	if err != nil {
		t.Fatal(err)
	}
	return *target
}

func (f *fixture) backupPath(name, identifier string) string {
	return filepath.Join(f.root, "backup", name, identifier)
}

func decryptArchive(t *testing.T, path, key string) string {
	t.Helper()
	in, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer in.Close()
	plain := filepath.Join(t.TempDir(), "plain.zip")
	out, err := os.Create(plain)
	if err != nil {
		t.Fatal(err)
	}
	defer out.Close()
	if err := encryption.DecryptFile(out, in, key); err != nil {
		t.Fatalf("decrypt backup: %v", err)
	}
	return plain
}

func archiveEntries(t *testing.T, path string) []string {
	t.Helper()
	reader, err := zip.OpenReader(path)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	var names []string
	for _, file := range reader.File {
		names = append(names, file.Name)
	}
	return names
}

func writeZip(t *testing.T, path string, entries map[string]string) {
	t.Helper()
	out, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	archive := zip.NewWriter(out)
	for _, name := range slices.Sorted(func(yield func(string) bool) {
		for name := range entries {
			if !yield(name) {
				return
			}
		}
	}) {
		entry, err := archive.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		io.WriteString(entry, entries[name])
	}
	archive.Close()
	out.Close()
}

func sqliteBytes(t *testing.T, prepare func(ctx context.Context, db drivers.DB)) string {
	t.Helper()
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "entry.sqlite")
	db, err := sqlite.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	if prepare != nil {
		prepare(ctx, db)
	}
	db.Close()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func newRestoreFiles(t *testing.T) (*storage.Storage, string) {
	t.Helper()
	root := t.TempDir()
	files := storage.New(filepath.Join(root, "temp"), filepath.Join(root, "files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}
	return files, root
}

func TestArchiveRestoresDatabaseAndFiles(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	userId, err := f.repo.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "Backed Up", Username: "kept", Password: "password1", Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.repo.Sessions().CreateNewSession(ctx, repository.NewSessionRecord{Key: "live-session", UserId: userId, ExpiresAt: time.Now().Add(time.Hour).UnixMilli(), Data: []byte(`{}`)}); err != nil {
		t.Fatal(err)
	}
	if err := f.files.WriteFile("photo-id", strings.NewReader("PNGDATA")); err != nil {
		t.Fatal(err)
	}

	target := f.localTarget(t, "local")
	item, err := f.backups.CreateManual(ctx, target)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(item.Identifier, "manual-") || !strings.HasSuffix(item.Identifier, ".zip.enc") {
		t.Errorf("identifier = %q", item.Identifier)
	}
	backup := f.backupPath("local", item.Identifier)
	if info, err := os.Stat(backup); err != nil || info.Mode().Perm() != 0o600 {
		t.Errorf("backup file = %v, %v", info, err)
	}
	if info, err := os.Stat(filepath.Dir(backup)); err != nil || info.Mode().Perm() != 0o700 {
		t.Errorf("backup folder = %v, %v", info, err)
	}
	if _, err := zip.OpenReader(backup); err == nil {
		t.Error("the saved backup is a plain zip")
	}
	if names := archiveEntries(t, decryptArchive(t, backup, testKey)); !slices.Equal(names, []string{"manifest.json", "database.sqlite", "files/photo-id"}) {
		t.Errorf("archive entries = %v", names)
	}
	if entries, _ := os.ReadDir(filepath.Join(f.root, "temp")); len(entries) != 0 {
		t.Errorf("temp folder after backup = %v", entries)
	}

	// Restore into a fresh place, as onto a new server.
	restoredFiles, restoreRoot := newRestoreFiles(t)
	restoredDB := filepath.Join(restoreRoot, "database.sqlite")
	if err := os.WriteFile(restoredDB+"-wal", []byte("stale"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := Restore(ctx, backup, "wrong-key", restoredDB, restoredFiles); !errors.Is(err, ErrWrongKey) {
		t.Errorf("restore with the wrong key = %v", err)
	}
	result, err := Restore(ctx, backup, testKey, restoredDB, restoredFiles)
	if err != nil {
		t.Fatal(err)
	}
	if result.Files != 1 {
		t.Errorf("restored files = %d", result.Files)
	}
	if _, err := os.Stat(restoredDB + "-wal"); !errors.Is(err, os.ErrNotExist) {
		t.Error("stale WAL file kept")
	}
	if info, err := os.Stat(restoredDB); err != nil || info.Mode().Perm() != 0o600 {
		t.Errorf("restored database = %v, %v", info, err)
	}
	data, err := os.ReadFile(filepath.Join(restoreRoot, "files", "photo-id"))
	if err != nil || string(data) != "PNGDATA" {
		t.Errorf("restored file = %q, %v", data, err)
	}
	if names, _ := restoredFiles.FileNames(); !slices.Equal(names, []string{"photo-id"}) {
		t.Errorf("restored file names = %v", names)
	}

	restored, err := sqlite.Open(ctx, restoredDB)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	restoredRepo := sqlrepo.New(restored, "sqlite")
	if exists, err := restoredRepo.UserExists(ctx, "kept"); err != nil || !exists {
		t.Errorf("restored database lacks the user: %v, %v", exists, err)
	}
	var sessions int
	if err := restored.QueryRowContext(ctx, `SELECT COUNT(*) FROM "session"`).Scan(&sessions); err != nil || sessions != 0 {
		t.Errorf("sessions in the restored database = %d, %v", sessions, err)
	}
	plain, err := os.ReadFile(decryptArchive(t, backup, testKey))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(plain), "live-session") {
		t.Error("the session key is in the backup")
	}
}

func TestPlainArchiveStillRestores(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	if _, err := f.repo.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "Old", Username: "old", Password: "password1", Role: "user"}); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(f.root, "old.zip")
	if err := createArchive(ctx, f.db, "sqlite", f.files, archive); err != nil {
		t.Fatal(err)
	}
	files, root := newRestoreFiles(t)
	if _, err := Restore(ctx, archive, testKey, filepath.Join(root, "db.sqlite"), files); err != nil {
		t.Fatal(err)
	}
	restored, err := sqlite.Open(ctx, filepath.Join(root, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	if exists, err := sqlrepo.New(restored, "sqlite").UserExists(ctx, "old"); err != nil || !exists {
		t.Errorf("restored database lacks the user: %v, %v", exists, err)
	}
}

func TestRestoreRejectsOtherFiles(t *testing.T) {
	ctx := context.Background()
	files, root := newRestoreFiles(t)
	database := sqliteBytes(t, nil)

	plain := filepath.Join(root, "plain.db")
	if err := os.WriteFile(plain, []byte("SQLite format 3"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := Restore(ctx, plain, testKey, filepath.Join(root, "out.sqlite"), files); err == nil {
		t.Error("restored a file that is not a zip")
	}

	unsafe := filepath.Join(root, "unsafe.zip")
	writeZip(t, unsafe, map[string]string{"manifest.json": `{"format":1}`, "database.sqlite": database, "files/../../escape": "x"})
	if _, err := Restore(ctx, unsafe, testKey, filepath.Join(root, "out.sqlite"), files); err == nil {
		t.Error("restored a path outside the files folder")
	}
	if _, err := os.Stat(filepath.Join(root, "escape")); !errors.Is(err, os.ErrNotExist) {
		t.Error("file written outside the files folder")
	}
	if _, err := os.Stat(filepath.Join(root, "out.sqlite")); !errors.Is(err, os.ErrNotExist) {
		t.Error("database replaced although the restore failed")
	}
	for _, name := range []string{"nul", "a:b"} {
		writeZip(t, unsafe, map[string]string{"manifest.json": `{"format":1}`, "database.sqlite": database, "files/" + name: "x"})
		if _, err := Restore(ctx, unsafe, testKey, filepath.Join(root, "out.sqlite"), files); !errors.Is(err, storage.ErrInvalidName) {
			t.Errorf("restore of file %q = %v", name, err)
		}
	}
}

func TestRestoreChecksTheDatabaseBeforeWritingFiles(t *testing.T) {
	ctx := context.Background()
	files, root := newRestoreFiles(t)
	tempDir := t.TempDir()
	for _, name := range []string{"TMPDIR", "TMP", "TEMP"} {
		t.Setenv(name, tempDir)
	}
	if err := files.WriteFile("photo-id", strings.NewReader("current")); err != nil {
		t.Fatal(err)
	}
	databasePath := filepath.Join(root, "out.sqlite")
	if err := os.WriteFile(databasePath, []byte("current"), 0o600); err != nil {
		t.Fatal(err)
	}

	damaged := sqliteBytes(t, nil)
	damaged = damaged[:100] + strings.Repeat("\x00", 1000) + damaged[1100:]
	for name, database := range map[string]string{
		"text":        "restored database",
		"damaged":     damaged,
		"not-noteme":  sqliteHeader + strings.Repeat("\x00", 4096-len(sqliteHeader)),
		"no-sessions": sqliteBytes(t, func(ctx context.Context, db drivers.DB) { db.ExecContext(ctx, `DROP TABLE "session"`) }),
	} {
		archive := filepath.Join(root, name+".zip")
		writeZip(t, archive, map[string]string{"manifest.json": `{"format":1}`, "database.sqlite": database, "files/photo-id": "from backup"})
		if _, err := Restore(ctx, archive, testKey, databasePath, files); err == nil {
			t.Errorf("%s: restored an invalid database", name)
		}
		if data, _ := os.ReadFile(filepath.Join(root, "files", "photo-id")); string(data) != "current" {
			t.Errorf("%s: file replaced although the database is invalid: %q", name, data)
		}
		if data, _ := os.ReadFile(databasePath); string(data) != "current" {
			t.Errorf("%s: database replaced: %q", name, data)
		}
	}
	entries, _ := os.ReadDir(filepath.Join(root, "files"))
	if len(entries) != 1 {
		t.Errorf("files folder after failed restores = %v", entries)
	}
	if entries, _ := os.ReadDir(tempDir); len(entries) != 0 {
		t.Errorf("temp files left behind: %v", entries)
	}

	// A valid database but the database copy fails: staged files are dropped.
	valid := filepath.Join(root, "valid.zip")
	writeZip(t, valid, map[string]string{"manifest.json": `{"format":1}`, "database.sqlite": sqliteBytes(t, nil), "files/photo-id": "from backup"})
	if _, err := Restore(ctx, valid, testKey, filepath.Join(root, "missing", "out.sqlite"), files); err == nil {
		t.Error("restored into a missing folder")
	}
	if data, _ := os.ReadFile(filepath.Join(root, "files", "photo-id")); string(data) != "current" {
		t.Errorf("file replaced although the database failed: %q", data)
	}
	if _, err := Restore(ctx, valid, testKey, databasePath, files); err != nil {
		t.Fatal(err)
	}
	if data, _ := os.ReadFile(filepath.Join(root, "files", "photo-id")); string(data) != "from backup" {
		t.Errorf("file after restore = %q", data)
	}
}

func TestRestoreLimits(t *testing.T) {
	ctx := context.Background()
	files, root := newRestoreFiles(t)

	lying := filepath.Join(root, "lying.zip")
	writeZip(t, lying, map[string]string{"files/big": strings.Repeat("x", 100)})
	reader, err := zip.OpenReader(lying)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	reader.File[0].UncompressedSize64 = 10
	var copied int64
	err = copyEntry(reader.File[0], func(r io.Reader) error { n, err := io.Copy(io.Discard, r); copied = n; return err })
	if err == nil || copied > 11 {
		t.Errorf("entry beyond its declared size = %v, copied %d bytes", err, copied)
	}

	many := filepath.Join(root, "many.zip")
	out, err := os.Create(many)
	if err != nil {
		t.Fatal(err)
	}
	archive := zip.NewWriter(out)
	for i := range maxArchiveEntries + 1 {
		if _, err := archive.CreateHeader(&zip.FileHeader{Name: fmt.Sprintf("files/%d", i), Method: zip.Store}); err != nil {
			t.Fatal(err)
		}
	}
	archive.Close()
	out.Close()
	_, err = Restore(ctx, many, testKey, filepath.Join(root, "out.sqlite"), files)
	if err == nil || !strings.Contains(err.Error(), "entries") {
		t.Errorf("archive with too many entries = %v", err)
	}
	if entries, _ := os.ReadDir(filepath.Join(root, "files")); len(entries) != 0 {
		t.Errorf("files written from an oversized archive: %v", entries)
	}
}

func TestValidLocalLocation(t *testing.T) {
	for _, location := range []string{"backups", "nested/backups", "a-b.c", "ümlaut"} {
		if !ValidLocalLocation(location) {
			t.Errorf("ValidLocalLocation(%q) = false", location)
		}
	}
	for _, location := range []string{"", "/", "/etc", "../x", "a/../b", "a//b", "a/", "./a", `a\b`, "C:/x", "nul", "a/CON/b", "."} {
		if ValidLocalLocation(location) {
			t.Errorf("ValidLocalLocation(%q) = true", location)
		}
	}
}

func TestLocalTarget(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	target, err := newLocalTarget(root, "nested/backups")
	if err != nil {
		t.Fatal(err)
	}
	if target.dir != filepath.Join(root, "nested", "backups") {
		t.Errorf("dir = %s", target.dir)
	}
	for _, location := range []string{"../x", "/etc", "a/../../b"} {
		if _, err := newLocalTarget(root, location); !errors.Is(err, ErrSettings) {
			t.Errorf("newLocalTarget(%q) = %v", location, err)
		}
		if _, err := newTarget(root, TypeLocal, `{"location":"`+location+`"}`); !errors.Is(err, ErrSettings) {
			t.Errorf("newTarget(%q) = %v", location, err)
		}
	}
	if _, err := newTarget(root, "ftp", `{}`); !errors.Is(err, ErrSettings) {
		t.Errorf("unknown type = %v", err)
	}
	if _, err := newTarget(root, TypeLocal, `{`); !errors.Is(err, ErrSettings) {
		t.Errorf("broken settings = %v", err)
	}

	if items, err := target.List(ctx); err != nil || len(items) != 0 {
		t.Fatalf("list before setup = %v, %v", items, err)
	}
	source := filepath.Join(root, "source.zip")
	if err := os.WriteFile(source, []byte("archive"), 0o600); err != nil {
		t.Fatal(err)
	}
	item, err := target.Save(ctx, "manual-1.zip", source)
	if err != nil || item.Size != 7 {
		t.Fatalf("save = %+v, %v", item, err)
	}
	if info, err := os.Stat(filepath.Join(root, "nested", "backups")); err != nil || info.Mode().Perm() != 0o700 {
		t.Errorf("target folder = %v, %v", info, err)
	}
	reader, size, err := target.Open(ctx, "manual-1.zip")
	if err != nil || size != 7 {
		t.Fatalf("open = %d, %v", size, err)
	}
	data, _ := io.ReadAll(reader)
	reader.Close()
	if string(data) != "archive" {
		t.Errorf("data = %q", data)
	}
	if _, _, err := target.Open(ctx, "missing.zip"); !errors.Is(err, ErrNotFound) {
		t.Errorf("missing = %v", err)
	}
	for _, identifier := range []string{"..", "../x", ".", "a/b"} {
		if _, _, err := target.Open(ctx, identifier); !errors.Is(err, ErrNotFound) {
			t.Errorf("open %q = %v", identifier, err)
		}
		if err := target.Delete(ctx, identifier); !errors.Is(err, ErrNotFound) {
			t.Errorf("delete %q = %v", identifier, err)
		}
	}
	if err := target.Delete(ctx, "manual-1.zip"); err != nil {
		t.Fatal(err)
	}
	if items, _ := target.List(ctx); len(items) != 0 {
		t.Errorf("after delete = %v", items)
	}

	if _, err := target.Save(ctx, "manual-2.zip", filepath.Join(root, "missing.zip")); !errors.Is(err, ErrSave) {
		t.Errorf("save of a missing source = %v", err)
	}
	if err := os.Chmod(filepath.Join(root, "nested", "backups"), 0o000); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(filepath.Join(root, "nested", "backups"), 0o700)
	if os.Getuid() != 0 {
		if _, err := target.List(ctx); !errors.Is(err, ErrList) {
			t.Errorf("list of an unreadable folder = %v", err)
		}
	}
}

type fakeTarget struct {
	items   []Item
	saveErr error
	saves   int
}

func (t *fakeTarget) Setup(context.Context) error { return nil }
func (t *fakeTarget) Save(_ context.Context, identifier, _ string) (Item, error) {
	t.saves++
	if t.saveErr != nil {
		return Item{}, t.saveErr
	}
	item := Item{Identifier: identifier, CreatedAt: time.Now().Unix() + int64(len(t.items))}
	t.items = append(t.items, item)
	return item, nil
}
func (t *fakeTarget) Delete(_ context.Context, identifier string) error {
	t.items = slices.DeleteFunc(t.items, func(item Item) bool { return item.Identifier == identifier })
	return nil
}
func (t *fakeTarget) Open(context.Context, string) (io.ReadCloser, int64, error) {
	return nil, 0, ErrNotFound
}
func (t *fakeTarget) List(context.Context) ([]Item, error) {
	items := slices.Clone(t.items)
	sortNewestFirst(items)
	return items, nil
}

func TestRetentionKeepsManualBackups(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	fake := &fakeTarget{items: []Item{
		{Identifier: "automatic-old-1.zip", CreatedAt: 100},
		{Identifier: "automatic-old-2.zip", CreatedAt: 200},
		{Identifier: "manual-ancient.zip", CreatedAt: 50},
		{Identifier: "automatic-old-3.zip", CreatedAt: 300},
	}}
	f.backups.newTarget = func(string, string) (Target, error) { return fake, nil }
	target := f.localTarget(t, "fake")

	if err := f.backups.RunAutomatic(ctx); err != nil {
		t.Fatal(err)
	}

	var names []string
	for _, item := range fake.items {
		names = append(names, item.Identifier)
	}
	slices.Sort(names)
	if len(names) != 3 || !strings.HasPrefix(names[0], "automatic-2") || !strings.HasSuffix(names[0], ".zip.enc") || names[1] != "automatic-old-3.zip" || names[2] != "manual-ancient.zip" {
		t.Errorf("kept backups = %v", names)
	}
	stored, _ := f.repo.BackupTargets().GetBackupTarget(ctx, target.Id)
	if stored.LastBackupAt == nil {
		t.Error("last backup time not set")
	}
	if inProgress, _ := f.repo.BackupTargets().IsBackupInProgress(ctx, target.Id); inProgress {
		t.Error("in progress flag left set")
	}
}

func TestAutomaticRunReportsFailedTargets(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	failing := &fakeTarget{saveErr: fmt.Errorf("%w: AccessDenied", ErrSave)}
	working := &fakeTarget{}
	f.backups.newTarget = func(_, settings string) (Target, error) {
		if strings.Contains(settings, "offsite") {
			return failing, nil
		}
		return working, nil
	}
	offsite := f.localTarget(t, "offsite")
	f.localTarget(t, "local")

	err := f.backups.RunAutomatic(ctx)
	if err == nil || !strings.Contains(err.Error(), "offsite: "+ErrSave.Error()+": AccessDenied") {
		t.Errorf("run error = %v", err)
	}
	if len(working.items) != 1 {
		t.Error("the working target was skipped")
	}
	if inProgress, _ := f.repo.BackupTargets().IsBackupInProgress(ctx, offsite.Id); inProgress {
		t.Error("the failed target was left in progress")
	}
}

func TestManualBackupClaimsTheTargetFirst(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	failing := &fakeTarget{saveErr: errors.New("disk full")}
	f.backups.newTarget = func(string, string) (Target, error) { return failing, nil }
	target := f.localTarget(t, "fake")

	if _, err := f.backups.CreateManual(ctx, target); err == nil || !strings.Contains(err.Error(), "disk full") {
		t.Errorf("failed save = %v", err)
	}
	if inProgress, _ := f.repo.BackupTargets().IsBackupInProgress(ctx, target.Id); inProgress {
		t.Error("the failed backup left the target in progress")
	}
	stored, _ := f.repo.BackupTargets().GetBackupTarget(ctx, target.Id)
	if stored.LastBackupAt != nil {
		t.Error("last backup time set for a failed backup")
	}

	f.backups.tempDir = filepath.Join(f.root, "missing")
	if _, err := f.backups.CreateManual(ctx, target); !errors.Is(err, ErrCreate) {
		t.Errorf("failed archive build = %v", err)
	}
	if failing.saves != 1 {
		t.Errorf("saves after a failed build = %d", failing.saves)
	}
	if inProgress, _ := f.repo.BackupTargets().IsBackupInProgress(ctx, target.Id); inProgress {
		t.Error("the failed build left the target in progress")
	}
}

func TestBusyTargetIsNotBackedUpTwice(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	target := f.localTarget(t, "local")
	if claimed, _ := f.repo.BackupTargets().ClaimBackupTarget(ctx, target.Id); !claimed {
		t.Fatal("claim failed")
	}

	if _, err := f.backups.CreateManual(ctx, target); !errors.Is(err, ErrInProgress) {
		t.Errorf("manual backup of a busy target = %v", err)
	}
	if err := f.backups.RunAutomatic(ctx); err == nil || !strings.Contains(err.Error(), ErrInProgress.Error()) {
		t.Errorf("automatic backup of a busy target = %v", err)
	}
	if inProgress, _ := f.repo.BackupTargets().IsBackupInProgress(ctx, target.Id); !inProgress {
		t.Error("the other backup's flag was cleared")
	}
	if entries, _ := os.ReadDir(filepath.Join(f.root, "temp")); len(entries) != 0 {
		t.Errorf("temp folder after refused backups = %v", entries)
	}
}

func TestAutomaticRunSkips(t *testing.T) {
	f := setup(t)
	f.backups.newTarget = func(string, string) (Target, error) {
		t.Fatal("target used")
		return nil, nil
	}
	if err := f.backups.RunAutomatic(context.Background()); err != nil {
		t.Errorf("no targets = %v", err)
	}
	f.localTarget(t, "local")
	f.backups.maxCount = 0
	if err := f.backups.RunAutomatic(context.Background()); err != nil {
		t.Errorf("disabled = %v", err)
	}
	f.backups.maxCount = 2
	f.backups.inMemory = true
	if err := f.backups.RunAutomatic(context.Background()); err != nil {
		t.Errorf("in memory = %v", err)
	}
}
