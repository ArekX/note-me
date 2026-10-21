package backups

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/config"
	"noteme/internal/encryption"
)

const (
	KindAutomatic = "automatic"
	KindManual    = "manual"
)

type Backups struct {
	db       drivers.DB
	dbType   string
	repo     repository.Repository
	files    *storage.Storage
	tempDir  string
	key      string
	inMemory bool
	maxCount int
	log      *slog.Logger
	// VACUUM INTO holds the single sqlite connection, so archives are built
	// one at a time.
	building sync.Mutex
	// Replaced in tests.
	newTarget func(targetType, settings string) (Target, error)
}

func New(db drivers.DB, repo repository.Repository, files *storage.Storage, cfg *config.Config, log *slog.Logger) *Backups {
	return &Backups{
		db:       db,
		dbType:   cfg.DatabaseType,
		repo:     repo,
		files:    files,
		tempDir:  cfg.TempDir,
		key:      cfg.BackupEncryptionKey,
		inMemory: cfg.IsInMemoryDatabase(),
		maxCount: cfg.MaxAllowedBackupCount,
		log:      log,
		newTarget: func(targetType, settings string) (Target, error) {
			return newTarget(cfg.BackupDir, targetType, settings)
		},
	}
}

func (b *Backups) MaxCount() int {
	return b.maxCount
}

func (b *Backups) Target(target repository.BackupTarget) (Target, error) {
	return b.newTarget(target.Type, target.Settings)
}

func Identifier(kind string, at time.Time) string {
	return kind + "-" + at.UTC().Format("2006-01-02-15-04-05") + ".zip.enc"
}

// The encrypted archive is written to the temp folder; the caller removes it.
func (b *Backups) createArchive(ctx context.Context) (string, error) {
	b.building.Lock()
	defer b.building.Unlock()

	path := filepath.Join(b.tempDir, "backup-"+uuid.NewString()+".zip")
	defer os.Remove(path)
	if err := createArchive(ctx, b.db, b.dbType, b.files, path); err != nil {
		return "", fmt.Errorf("%w: %w", ErrCreate, err)
	}
	encrypted := path + ".enc"
	if err := encryptArchive(path, encrypted, b.key); err != nil {
		os.Remove(encrypted)
		return "", fmt.Errorf("%w: %w", ErrCreate, err)
	}
	return encrypted, nil
}

func encryptArchive(source, target, key string) (err error) {
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, archiveFileMode)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := out.Close(); err == nil {
			err = closeErr
		}
	}()
	return encryption.EncryptFile(out, in, key)
}

func (b *Backups) claim(ctx context.Context, target repository.BackupTarget) (release func(successful bool), err error) {
	claimed, err := b.repo.BackupTargets().ClaimBackupTarget(ctx, target.Id)
	if err != nil {
		return nil, err
	}
	if !claimed {
		return nil, ErrInProgress
	}
	return func(successful bool) {
		if err := b.repo.BackupTargets().ReleaseBackupTarget(context.WithoutCancel(ctx), target.Id, successful); err != nil {
			b.log.Error("Could not release backup target", "target", target.Id, "error", err)
		}
	}, nil
}

func (b *Backups) saveTo(ctx context.Context, target repository.BackupTarget, archive, identifier string, afterSave func(Target) error) (Item, error) {
	handler, err := b.Target(target)
	if err != nil {
		return Item{}, err
	}
	item, err := handler.Save(ctx, identifier, archive)
	if err != nil {
		return Item{}, err
	}
	if afterSave != nil {
		if err := afterSave(handler); err != nil {
			return Item{}, err
		}
	}
	return item, nil
}

func (b *Backups) CreateManual(ctx context.Context, target repository.BackupTarget) (item Item, err error) {
	release, err := b.claim(ctx, target)
	if err != nil {
		return Item{}, err
	}
	defer func() { release(err == nil) }()

	archive, err := b.createArchive(ctx)
	if err != nil {
		return Item{}, err
	}
	defer os.Remove(archive)
	return b.saveTo(ctx, target, archive, Identifier(KindManual, time.Now()), nil)
}

// The nightly run: one archive saved to every target, then the oldest
// automatic backups beyond MAX_ALLOWED_BACKUP_COUNT are deleted (manual ones
// never are). A failing target does not stop the others; the run reports
// which ones failed so the task list shows it.
func (b *Backups) RunAutomatic(ctx context.Context) error {
	if b.maxCount <= 0 {
		b.log.Info("Backup count limit is set to 0, skipping database backup")
		return nil
	}
	if b.inMemory {
		b.log.Info("Skipping database backup, as the database is in-memory")
		return nil
	}
	targets, err := b.repo.BackupTargets().GetBackupTargets(ctx)
	if err != nil {
		return err
	}
	if len(targets) == 0 {
		b.log.Info("No backup targets found, skipping database backup")
		return nil
	}

	archive, err := b.createArchive(ctx)
	if err != nil {
		return err
	}
	defer os.Remove(archive)

	identifier := Identifier(KindAutomatic, time.Now())
	var failed []string
	for _, target := range targets {
		err := b.saveClaimed(ctx, target, archive, identifier)
		if err != nil {
			b.log.Error("Backup failed", "target", target.Name, "id", target.Id, "error", err)
			failed = append(failed, fmt.Sprintf("%s: %v", target.Name, err))
		}
	}
	if len(failed) > 0 {
		return errors.New(strings.Join(failed, "; "))
	}
	return nil
}

func (b *Backups) saveClaimed(ctx context.Context, target repository.BackupTarget, archive, identifier string) (err error) {
	release, err := b.claim(ctx, target)
	if err != nil {
		return err
	}
	defer func() { release(err == nil) }()
	_, err = b.saveTo(ctx, target, archive, identifier, func(handler Target) error {
		return b.removeOldAutomatic(ctx, handler)
	})
	return err
}

func (b *Backups) removeOldAutomatic(ctx context.Context, handler Target) error {
	items, err := handler.List(ctx)
	if err != nil {
		return err
	}
	automatic := slices.DeleteFunc(items, func(item Item) bool {
		return !strings.HasPrefix(item.Identifier, KindAutomatic+"-")
	})
	// Newest first, so everything after maxCount is the oldest.
	for _, item := range automatic[min(b.maxCount, len(automatic)):] {
		b.log.Info("Removing backup", "identifier", item.Identifier)
		if err := handler.Delete(ctx, item.Identifier); err != nil {
			return err
		}
	}
	return nil
}
