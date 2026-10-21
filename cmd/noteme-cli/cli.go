package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"noteme/internal/app"
	"noteme/internal/components/backups"
	"noteme/internal/components/database"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/config"
	"noteme/internal/http/validation"
	"noteme/internal/version"
)

var migrationsDirs = []string{
	"internal/components/database/drivers/sqlite/migrations",
	"internal/components/database/drivers/postgres/migrations",
	"internal/components/database/drivers/mysql/migrations",
}

const usage = `NoteMe %s

Usage: noteme-cli <command> [options]

Commands:
  migrate-up     Apply pending database migrations
  migrate-down   Roll back the last database migration
  new-migration  Create a new migration file pair in every driver's folder:
                 new-migration [--dir <dir>] <name>
  add-user       Add an administrator: add-user <name> <username>
                 The password (8 to 128 characters) is read from standard input.
  restore-backup Restore a backup (database and uploaded files) with the
                 server stopped, decrypted with BACKUP_ENCRYPTION_KEY:
                 restore-backup [--overwrite] <backup.zip.enc>
  healthcheck    Exit 0 when the local server answers /api/health, 1 otherwise
  version        Print version information
`

func main() {
	time.Local = time.UTC
	os.Exit(run(os.Args[1:], os.Stdin))
}

func run(args []string, in io.Reader) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, usage, version.String())
		return 2
	}
	name, args := args[0], args[1:]

	var err error
	switch name {
	case "migrate-up":
		err = migrateUp(ctx)
	case "migrate-down":
		err = migrateDown(ctx)
	case "new-migration":
		err = newMigration(args)
	case "add-user":
		err = addUser(ctx, args, in)
	case "restore-backup":
		err = restoreBackup(ctx, args)
	case "healthcheck":
		err = healthcheck(ctx)
	case "version":
		fmt.Println(version.String())
	case "help", "-h", "--help":
		fmt.Printf(usage, version.String())
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n\n"+usage, name, version.String())
		return 2
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: %v\n", name, err)
		return 1
	}
	return 0
}

func migrateUp(ctx context.Context) error {
	a, err := app.Init(ctx)
	if err != nil {
		return err
	}
	defer a.Close()

	migrator := a.Components.Migrator

	reason, err := migrator.UpgradeReason(ctx)
	if err != nil {
		return err
	}
	if reason != "" {
		return fmt.Errorf("run noteme-upgrade first: %s", reason)
	}

	isFirstRun, err := migrator.IsFirstRun(ctx)
	if err != nil {
		return err
	}

	applied, err := migrator.Up(ctx)
	if err != nil {
		return err
	}
	if len(applied) == 0 {
		fmt.Println("No pending migrations.")
	}
	for _, name := range applied {
		fmt.Println("Applied", name)
	}

	if isFirstRun {
		return a.Components.CreateInitialAdministrator(ctx)
	}
	return nil
}

func migrateDown(ctx context.Context) error {
	a, err := app.Init(ctx)
	if err != nil {
		return err
	}
	defer a.Close()

	name, err := a.Components.Migrator.Down(ctx)
	if err != nil {
		return err
	}
	if name == "" {
		fmt.Println("Nothing to roll back.")
		return nil
	}
	fmt.Println("Reverted", name)
	return nil
}

func newMigration(args []string) error {
	fs := flag.NewFlagSet("new-migration", flag.ContinueOnError)
	dir := fs.String("dir", "", "directory to write the migration into instead of every driver's folder")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 1 {
		return fmt.Errorf("usage: new-migration [--dir <dir>] <name>")
	}

	dirs := migrationsDirs
	if *dir != "" {
		dirs = []string{*dir}
	}
	paths, err := migrate.Create(fs.Arg(0), dirs...)
	for _, path := range paths {
		fmt.Println("Created", path)
	}
	return err
}

func addUser(ctx context.Context, args []string, in io.Reader) error {
	if len(args) != 2 {
		return fmt.Errorf("usage: add-user <name> <username>  (the password is read from standard input)")
	}
	name, username := args[0], args[1]
	password, err := readPassword(in)
	if err != nil {
		return err
	}

	a, err := app.Init(ctx)
	if err != nil {
		return err
	}
	defer a.Close()

	exists, err := a.Components.Repository.Users().UserExists(ctx, username)
	if err != nil {
		return err
	}
	if exists {
		fmt.Printf("User with username '%s' already exists!\n", username)
		return nil
	}

	fmt.Println("Creating user...")
	fmt.Println("Name:", name)
	fmt.Println("Username:", username)
	fmt.Println("Role: admin")
	fmt.Println("Timezone: UTC")

	if _, err := a.Components.Repository.Users().CreateUserRecord(ctx, repository.NewUserRecord{
		Name:     name,
		Username: username,
		Password: password,
		Role:     "admin",
		Timezone: "UTC",
	}); err != nil {
		return err
	}

	fmt.Println("User created!")
	return nil
}

// Same rules as the app's password fields.
func readPassword(in io.Reader) (string, error) {
	if file, ok := in.(*os.File); ok {
		if info, err := file.Stat(); err == nil && info.Mode()&os.ModeCharDevice != 0 {
			fmt.Print("Password: ")
		}
	}
	line, err := bufio.NewReader(in).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("read password: %w", err)
	}
	password := strings.TrimRight(line, "\r\n")
	switch length := validation.Length(password); {
	case length < 8:
		return "", errors.New("Password must have at least 8 characters")
	case length > 128:
		return "", errors.New("Password must have at most 128 characters")
	}
	return password, nil
}

// Works on the configured DATABASE_DSN and FILES_LOCATION. A sqlite file is
// replaced without opening it; PostgreSQL and MySQL are migrated and get
// their rows replaced.
func restoreBackup(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("restore-backup", flag.ContinueOnError)
	overwrite := fs.Bool("overwrite", false, "replace an existing database")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 1 {
		return fmt.Errorf("usage: restore-backup [--overwrite] <backup.zip>")
	}

	if err := config.LoadEnvironment(); err != nil {
		return fmt.Errorf("load environment: %w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.IsInMemoryDatabase() {
		return fmt.Errorf("%s must point to a database file, not :memory:", config.EnvDatabaseDsn)
	}
	if err := cfg.RequireBackupEncryptionKey(); err != nil {
		return err
	}

	files := storage.New(cfg.TempDir, cfg.FilesDir)
	if err := files.Init(); err != nil {
		return err
	}

	var result *backups.RestoreResult
	target := cfg.DatabaseDsn
	if cfg.DatabaseType == "sqlite" {
		if _, err := os.Stat(cfg.DatabaseDsn); err == nil && !*overwrite {
			return fmt.Errorf("database %s already exists; stop the server and pass --overwrite to replace it", cfg.DatabaseDsn)
		}
		result, err = backups.Restore(ctx, fs.Arg(0), cfg.BackupEncryptionKey, cfg.DatabaseDsn, files)
	} else {
		// The DSN can hold a password.
		target = cfg.DatabaseType + " database"
		result, err = restoreIntoServer(ctx, cfg, fs.Arg(0), *overwrite, files)
	}
	if err != nil {
		return err
	}

	fmt.Printf("Restored the backup made %s (%s).\n", time.Unix(result.CreatedAt, 0).UTC().Format(time.RFC3339), result.Version)
	fmt.Println("Database:", target)
	fmt.Printf("Files:    %d restored into %s\n", result.Files, cfg.FilesDir)
	return nil
}

func restoreIntoServer(ctx context.Context, cfg *config.Config, archive string, overwrite bool, files *storage.Storage) (*backups.RestoreResult, error) {
	db, err := database.Open(ctx, cfg)
	if err != nil {
		return nil, err
	}
	defer db.DB.Close()

	reason, err := db.Migrator.UpgradeReason(ctx)
	if err != nil {
		return nil, err
	}
	if reason != "" {
		return nil, fmt.Errorf("run noteme-upgrade first: %s", reason)
	}
	if _, err := db.Migrator.Up(ctx); err != nil {
		return nil, err
	}

	var users int
	if err := db.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM "user"`).Scan(&users); err != nil {
		return nil, err
	}
	if users > 0 && !overwrite {
		return nil, fmt.Errorf("the %s database already has data; stop the server and pass --overwrite to replace it", cfg.DatabaseType)
	}

	return backups.RestoreInto(ctx, archive, cfg.BackupEncryptionKey, db.DB, cfg.DatabaseType, files)
}

// For the container health check: the distroless image has no curl or shell.
// It only reads the configuration and never opens the database.
func healthcheck(ctx context.Context) error {
	if err := config.LoadEnvironment(); err != nil {
		return fmt.Errorf("load environment: %w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	host := cfg.ServerAddress
	if ip := net.ParseIP(host); host == "" || (ip != nil && ip.IsUnspecified()) {
		host = "127.0.0.1"
	}
	url := "http://" + net.JoinHostPort(host, strconv.Itoa(cfg.WebserverPort)) + "/api/health"

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s answered %s", url, response.Status)
	}
	return nil
}
