package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/config"
	"noteme/internal/version"
)

func main() {
	time.Local = time.UTC

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "upgrade:", err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	if err := config.LoadEnvironment(); err != nil {
		return fmt.Errorf("load environment: %w", err)
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	fmt.Println("NoteMe database upgrade", version.String())

	if cfg.DatabaseType != "sqlite" {
		return fmt.Errorf("only sqlite databases can be upgraded, %s is %q", config.EnvDatabaseDsn, cfg.DatabaseType)
	}
	if cfg.IsInMemoryDatabase() {
		return fmt.Errorf("%s points to an in memory database, nothing to upgrade", config.EnvDatabaseDsn)
	}

	// Opening a missing path would create an empty database instead of failing.
	if _, err := os.Stat(cfg.DatabaseDsn); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("database %s does not exist", cfg.DatabaseDsn)
		}
		return err
	}

	db, err := sqlite.Open(ctx, cfg.DatabaseDsn)
	if err != nil {
		return err
	}
	defer db.Close()

	fmt.Println("Database:", cfg.DatabaseDsn)
	fmt.Println("Files:   ", cfg.FilesDir)

	return upgrade(ctx, db, cfg.FilesDir, os.Stdin, os.Stdout)
}
