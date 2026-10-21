package sqlrepo

import (
	"context"
	"database/sql"
	"fmt"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/repository"
)

type querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type Repository struct {
	db      drivers.DB
	q       querier
	inTx    bool
	dialect *dialect
}

// databaseType is one of the types config accepts.
func New(db drivers.DB, databaseType string) *Repository {
	d, ok := dialects[databaseType]
	if !ok {
		panic(fmt.Sprintf("sqlrepo: unsupported database type %q", databaseType))
	}
	return &Repository{
		db:      db,
		q:       db,
		dialect: d,
	}
}

func (r *Repository) RunInTransaction(ctx context.Context, fn func(tx repository.Repository) error) error {
	return r.runInTransaction(ctx, func(tx *Repository) error { return fn(tx) })
}

func (r *Repository) AI() repository.AI { return r }

func (r *Repository) AuditLog() repository.AuditLog { return r }

func (r *Repository) BackupTargets() repository.BackupTargets { return r }

func (r *Repository) Files() repository.Files { return r }

func (r *Repository) Groups() repository.Groups { return r }

func (r *Repository) MCP() repository.MCP { return r }

func (r *Repository) Notes() repository.Notes { return r }

func (r *Repository) NoteHistory() repository.NoteHistory { return r }

func (r *Repository) Reminders() repository.Reminders { return r }

func (r *Repository) Search() repository.Search { return r }

func (r *Repository) Shares() repository.Shares { return r }

func (r *Repository) Notifications() repository.Notifications { return r }

func (r *Repository) Passkeys() repository.Passkeys { return r }

func (r *Repository) PeriodicTasks() repository.PeriodicTasks { return r }

func (r *Repository) Sessions() repository.Sessions { return r }

func (r *Repository) Tags() repository.Tags { return r }

func (r *Repository) Tree() repository.Tree { return r }

func (r *Repository) Users() repository.Users { return r }

func (r *Repository) UserManagement() repository.UserManagement { return r }

func (r *Repository) runInTransaction(ctx context.Context, fn func(tx *Repository) error) error {
	if r.inTx {
		return fn(r)
	}

	sqlTx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	tx := &Repository{db: r.db, q: sqlTx, inTx: true, dialect: r.dialect}

	if err := fn(tx); err != nil {
		if rollbackErr := sqlTx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("rollback transaction: %w (after: %w)", rollbackErr, err)
		}
		return err
	}

	if err := sqlTx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

func (r *Repository) insert(ctx context.Context, query string, args ...any) (int64, error) {
	var id int64
	if r.dialect.returning {
		err := r.q.QueryRowContext(ctx, query+` RETURNING "id"`, args...).Scan(&id)
		return id, err
	}
	result, err := r.q.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}
