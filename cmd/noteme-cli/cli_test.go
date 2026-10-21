package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"noteme/internal/components/backups"
	"noteme/internal/components/database"
	"noteme/internal/components/database/databasetest"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/config"
	"noteme/internal/encryption"
	"noteme/internal/logger"
)

const testKey = "cli-backup-key"

func sqliteUserExists(t *testing.T, path, username string) bool {
	t.Helper()
	ctx := context.Background()
	db, err := sqlite.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	exists, err := sqlrepo.New(db, "sqlite").UserExists(ctx, username)
	if err != nil {
		t.Fatal(err)
	}
	return exists
}

func TestRestoreBackup(t *testing.T) {
	root := t.TempDir()
	t.Chdir(root)
	database := filepath.Join(root, "data", "database.sqlite")
	if err := os.MkdirAll(filepath.Dir(database), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("SKIP_ENV", "1")
	t.Setenv("DATABASE_DSN", "sqlite://"+database)
	t.Setenv("FILES_LOCATION", filepath.Join(root, "files"))
	backup := createBackup(t, filepath.Join(root, "source"), "first")

	if code := run([]string{"restore-backup", backup}, strings.NewReader("")); code != 1 {
		t.Errorf("restore without %s = %d", config.EnvBackupEncryptionKey, code)
	}
	t.Setenv(config.EnvBackupEncryptionKey, "other-key")
	if code := run([]string{"restore-backup", backup}, strings.NewReader("")); code != 1 {
		t.Errorf("restore with the wrong key = %d", code)
	}
	if _, err := os.Stat(database); err == nil {
		t.Error("database written although the key is wrong")
	}

	t.Setenv(config.EnvBackupEncryptionKey, testKey)
	if code := run([]string{"restore-backup", backup}, strings.NewReader("")); code != 0 {
		t.Fatalf("restore into an empty place = %d", code)
	}
	if !sqliteUserExists(t, database, "first") {
		t.Error("restored database lacks the user")
	}
	if data, _ := os.ReadFile(filepath.Join(root, "files", "photo-id")); string(data) != "PNGDATA" {
		t.Errorf("file = %q", data)
	}

	if err := os.WriteFile(database, []byte("current"), 0o600); err != nil {
		t.Fatal(err)
	}
	if code := run([]string{"restore-backup", backup}, strings.NewReader("")); code != 1 {
		t.Errorf("restore over an existing database without --overwrite = %d", code)
	}
	if data, _ := os.ReadFile(database); string(data) != "current" {
		t.Error("existing database replaced without --overwrite")
	}
	if code := run([]string{"restore-backup", "--overwrite", backup}, strings.NewReader("")); code != 0 {
		t.Errorf("restore with --overwrite = %d", code)
	}
	if !sqliteUserExists(t, database, "first") {
		t.Error("database after --overwrite lacks the user")
	}
}

// A real backup of a sqlite database with one user and one file.
func createBackup(t *testing.T, root, username string) string {
	t.Helper()
	ctx := context.Background()
	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatal(err)
	}
	db, err := sqlite.Open(ctx, filepath.Join(root, "source.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	repo := sqlrepo.New(db, "sqlite")
	if _, err := repo.CreateUserRecord(ctx, repository.NewUserRecord{Name: username, Username: username, Password: "password1", Role: "admin"}); err != nil {
		t.Fatal(err)
	}

	files := storage.New(filepath.Join(root, "source-temp"), filepath.Join(root, "source-files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}
	if err := files.WriteFile("photo-id", strings.NewReader("PNGDATA")); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		DatabaseType: "sqlite", TempDir: filepath.Join(root, "source-temp"), BackupDir: filepath.Join(root, "backup"),
		BackupEncryptionKey: testKey, MaxAllowedBackupCount: 1,
	}
	service := backups.New(db, repo, files, cfg, logger.New(logger.Options{Level: "ERROR", Output: io.Discard}))
	target, err := repo.CreateBackupTarget(ctx, repository.BackupTargetData{Name: "local", Type: backups.TypeLocal, Settings: `{"location":"local"}`})
	if err != nil {
		t.Fatal(err)
	}
	item, err := service.CreateManual(ctx, *target)
	if err != nil {
		t.Fatal(err)
	}
	return filepath.Join(root, "backup", "local", item.Identifier)
}

func TestRestoreBackupIntoDatabase(t *testing.T) {
	dsn := databasetest.DSN(t)
	if strings.HasPrefix(dsn, "sqlite://") {
		t.Skip("restoring a sqlite file is TestRestoreBackup; set " + databasetest.EnvDSN + " for a database server")
	}
	root := t.TempDir()
	t.Chdir(root)
	t.Setenv("SKIP_ENV", "1")
	t.Setenv("DATABASE_DSN", dsn)
	t.Setenv("FILES_LOCATION", filepath.Join(root, "files"))
	t.Setenv(config.EnvBackupEncryptionKey, testKey)
	first := createBackup(t, filepath.Join(root, "first"), "first")
	second := createBackup(t, filepath.Join(root, "second"), "second")

	userExists := func(username string) bool {
		t.Helper()
		cfg, err := config.Load()
		if err != nil {
			t.Fatal(err)
		}
		db, err := database.Open(context.Background(), cfg)
		if err != nil {
			t.Fatal(err)
		}
		defer db.DB.Close()
		exists, err := db.Repository.Users().UserExists(context.Background(), username)
		if err != nil {
			t.Fatal(err)
		}
		return exists
	}

	if code := run([]string{"restore-backup", first}, strings.NewReader("")); code != 0 {
		t.Fatalf("restore into an empty database = %d", code)
	}
	if !userExists("first") {
		t.Fatal("restored database lacks the user")
	}
	if code := run([]string{"restore-backup", second}, strings.NewReader("")); code != 1 {
		t.Errorf("restore over a database with data without --overwrite = %d", code)
	}
	if code := run([]string{"restore-backup", "--overwrite", second}, strings.NewReader("")); code != 0 {
		t.Fatalf("restore with --overwrite = %d", code)
	}
	if userExists("first") || !userExists("second") {
		t.Error("--overwrite did not replace the rows")
	}
}

func TestAddUser(t *testing.T) {
	root := t.TempDir()
	t.Chdir(root)
	database := filepath.Join(root, "database.sqlite")
	t.Setenv("SKIP_ENV", "1")
	t.Setenv("DATABASE_DSN", "sqlite://"+database)
	t.Setenv(config.EnvBackupEncryptionKey, testKey)
	t.Setenv(config.EnvAIEncryptionKey, testKey)
	if code := run([]string{"migrate-up"}, strings.NewReader("")); code != 0 {
		t.Fatalf("migrate-up = %d", code)
	}

	if code := run([]string{"add-user", "Jane", "jane", "password1"}, strings.NewReader("")); code != 1 {
		t.Errorf("password on the command line = %d", code)
	}
	for _, password := range []string{"", "short1\n", strings.Repeat("x", 129) + "\n", strings.Repeat("ü", 129) + "\n"} {
		if code := run([]string{"add-user", "Jane", "jane"}, strings.NewReader(password)); code != 1 {
			t.Errorf("password %q = %d", password, code)
		}
	}
	if sqliteUserExists(t, database, "jane") {
		t.Fatal("user created with an invalid password")
	}

	if code := run([]string{"add-user", "Jane", "jane"}, strings.NewReader("pässword1\r\nignored\n")); code != 0 {
		t.Fatalf("add-user = %d", code)
	}
	if code := run([]string{"add-user", "Jane", "jane"}, strings.NewReader("pässword1\n")); code != 0 {
		t.Errorf("add-user of an existing user = %d", code)
	}

	ctx := context.Background()
	db, err := sqlite.Open(ctx, database)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var hash, role string
	if err := db.QueryRowContext(ctx, `SELECT "password", "role" FROM "user" WHERE "username" = 'jane'`).Scan(&hash, &role); err != nil {
		t.Fatal(err)
	}
	if role != "admin" || !encryption.VerifyPassword(hash, "pässword1") {
		t.Errorf("user = %s, %s", role, hash)
	}
}

func TestHealthcheck(t *testing.T) {
	healthy := true
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/health" || !healthy {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()
	host, port, _ := net.SplitHostPort(strings.TrimPrefix(server.URL, "http://"))

	t.Setenv("SKIP_ENV", "1")
	t.Setenv("SERVER_ADDRESS", host)
	t.Setenv("WEBSERVER_PORT", port)
	if code := run([]string{"healthcheck"}, strings.NewReader("")); code != 0 {
		t.Errorf("healthy server = %d", code)
	}

	healthy = false
	if code := run([]string{"healthcheck"}, strings.NewReader("")); code != 1 {
		t.Errorf("failing health = %d", code)
	}

	// 0.0.0.0 is checked on the loopback address.
	t.Setenv("SERVER_ADDRESS", "0.0.0.0")
	server.Close()
	if code := run([]string{"healthcheck"}, strings.NewReader("")); code != 1 {
		t.Errorf("no server = %d", code)
	}
}
