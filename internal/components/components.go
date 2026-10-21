package components

import (
	"context"
	"fmt"
	"log/slog"
	"noteme/internal/components/ai"
	"noteme/internal/components/audit"
	"noteme/internal/components/backups"
	"noteme/internal/components/database"
	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/jobs"
	"noteme/internal/components/loginguard"
	"noteme/internal/components/passkeys"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/config"
	"noteme/internal/eventbus"
	"noteme/internal/logger"
)

type Components struct {
	DB            drivers.DB
	Migrator      *migrate.Migrator
	Log           *slog.Logger
	LogBuffer     *logger.Buffer
	Config        *config.Config
	Repository    repository.Repository
	Bus           *eventbus.Bus
	Storage       *storage.Storage
	Passkeys      *passkeys.Passkeys
	LoginGuard    *loginguard.Guard
	PasswordGuard *loginguard.PasswordGuard
	Jobs          *jobs.Queue
	Backups       *backups.Backups
	Audit         *audit.Log
	AI            *ai.AI
}

// logBuffer may be nil when no server log page will read it.
func New(ctx context.Context, logger *slog.Logger, logBuffer *logger.Buffer, cfg *config.Config) (*Components, error) {
	db, err := database.Open(ctx, cfg)
	if err != nil {
		return nil, err
	}

	repo := db.Repository
	files := storage.New(cfg.TempDir, cfg.FilesDir)
	keys := passkeys.New(cfg.AppURL, repo)
	if err := keys.Unavailable(); err != nil {
		logger.Warn("Passkeys are disabled, APP_URL must use a domain name", "error", err)
	}

	return &Components{
		DB:            db.DB,
		Migrator:      db.Migrator,
		Log:           logger,
		LogBuffer:     logBuffer,
		Config:        cfg,
		Repository:    repo,
		Bus:           eventbus.New(),
		Storage:       files,
		Passkeys:      keys,
		LoginGuard:    loginguard.New(),
		PasswordGuard: loginguard.NewPasswordGuard(cfg.MaxPasswordAttempts),
		Jobs:          jobs.New(),
		Backups:       backups.New(db.DB, repo, files, cfg, logger.With("component", "backups")),
		Audit:         audit.New(repo, logger),
		AI:            ai.New(cfg.AIEncryptionKey),
	}, nil
}

func (c *Components) Cleanup() error {
	return c.DB.Close()
}

func (c *Components) Initialize(ctx context.Context) error {
	reason, err := c.Migrator.UpgradeReason(ctx)
	if err != nil {
		return err
	}
	if reason != "" {
		return fmt.Errorf("the database needs noteme-upgrade before it can be used: %s", reason)
	}

	isFirstRun, err := c.Migrator.IsFirstRun(ctx)
	if err != nil {
		return fmt.Errorf("check first run: %w", err)
	}

	applied, err := c.Migrator.Up(ctx)
	if err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	for _, name := range applied {
		c.Log.Info("Applied migration", "name", name)
	}

	// Flags left behind by a backup that was cut off by a stop.
	if err := c.Repository.BackupTargets().ClearAllBackupInProgress(ctx); err != nil {
		return err
	}

	if isFirstRun {
		return c.CreateInitialAdministrator(ctx)
	}

	return nil
}

// The credentials are documented (README, decision 0.20) and the password
// must be changed at the first login, so they are not written to the log.
func (c *Components) CreateInitialAdministrator(ctx context.Context) error {
	c.Log.Info("Creating administrator user...")

	_, err := c.Repository.Users().CreateUserRecord(ctx, repository.NewUserRecord{
		Name:     "Administrator",
		Username: "admin",
		Password: "admin",
		Role:     "admin",
		Timezone: "UTC",
	})
	if err != nil {
		return fmt.Errorf("create administrator user: %w", err)
	}

	c.Log.Info("Administrator user created, sign in with the initial credentials from the documentation and change the password")

	return nil
}
