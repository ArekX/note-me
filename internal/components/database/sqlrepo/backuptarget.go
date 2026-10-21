package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

const backupTargetColumns = `"id", "name", "type", "settings", "created_at", "updated_at", "last_backup_at"`

func scanBackupTarget(scan func(...any) error) (repository.BackupTarget, error) {
	var target repository.BackupTarget
	var lastBackupAt sql.NullInt64
	err := scan(&target.Id, &target.Name, &target.Type, &target.Settings, &target.CreatedAt, &target.UpdatedAt, &lastBackupAt)
	if lastBackupAt.Valid {
		target.LastBackupAt = &lastBackupAt.Int64
	}
	return target, err
}

func (r *Repository) GetBackupTargets(ctx context.Context) ([]repository.BackupTarget, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT `+backupTargetColumns+` FROM "backup_target" ORDER BY "id"`)
	if err != nil {
		return nil, fmt.Errorf("get backup targets: %w", err)
	}
	defer rows.Close()

	targets := []repository.BackupTarget{}
	for rows.Next() {
		target, err := scanBackupTarget(rows.Scan)
		if err != nil {
			return nil, err
		}
		targets = append(targets, target)
	}
	return targets, rows.Err()
}

func (r *Repository) GetBackupTarget(ctx context.Context, id int) (*repository.BackupTarget, error) {
	target, err := scanBackupTarget(r.q.QueryRowContext(ctx, `SELECT `+backupTargetColumns+` FROM "backup_target" WHERE "id" = ?`, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get backup target: %w", err)
	}
	return &target, nil
}

func (r *Repository) CreateBackupTarget(ctx context.Context, data repository.BackupTargetData) (*repository.BackupTarget, error) {
	timestamp := now()
	id, err := r.insert(ctx,
		`INSERT INTO "backup_target" ("name", "type", "settings", "created_at", "updated_at")
		 VALUES (?, ?, ?, ?, ?)`,
		data.Name, data.Type, data.Settings, timestamp, timestamp)
	if err != nil {
		return nil, fmt.Errorf("create backup target: %w", err)
	}
	return r.GetBackupTarget(ctx, int(id))
}

func (r *Repository) UpdateBackupTarget(ctx context.Context, id int, data repository.BackupTargetData) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "backup_target" SET "name" = ?, "type" = ?, "settings" = ?, "updated_at" = ? WHERE "id" = ?`,
		data.Name, data.Type, data.Settings, now(), id)
	if err != nil {
		return false, fmt.Errorf("update backup target: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

// A target with a backup in progress is kept.
func (r *Repository) DeleteBackupTarget(ctx context.Context, id int) (bool, error) {
	result, err := r.q.ExecContext(ctx, `DELETE FROM "backup_target" WHERE "id" = ? AND "is_backup_in_progess" = false`, id)
	if err != nil {
		return false, fmt.Errorf("delete backup target: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) IsBackupInProgress(ctx context.Context, id int) (bool, error) {
	var inProgress bool
	err := r.q.QueryRowContext(ctx, `SELECT "is_backup_in_progess" FROM "backup_target" WHERE "id" = ?`, id).Scan(&inProgress)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check backup in progress: %w", err)
	}
	return inProgress, nil
}

// Marks the target as busy unless it already is, so a manual and an
// automatic backup never write to one target at the same time.
func (r *Repository) ClaimBackupTarget(ctx context.Context, id int) (bool, error) {
	result, err := r.q.ExecContext(ctx, `UPDATE "backup_target" SET "is_backup_in_progess" = true WHERE "id" = ? AND "is_backup_in_progess" = false`, id)
	if err != nil {
		return false, fmt.Errorf("claim backup target: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) ReleaseBackupTarget(ctx context.Context, id int, successful bool) error {
	query := `UPDATE "backup_target" SET "is_backup_in_progess" = false WHERE "id" = ?`
	args := []any{id}
	if successful {
		query = `UPDATE "backup_target" SET "is_backup_in_progess" = false, "last_backup_at" = ? WHERE "id" = ?`
		args = []any{now(), id}
	}
	if _, err := r.q.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("release backup target: %w", err)
	}
	return nil
}

func (r *Repository) ClearAllBackupInProgress(ctx context.Context) error {
	if _, err := r.q.ExecContext(ctx, `UPDATE "backup_target" SET "is_backup_in_progess" = false`); err != nil {
		return fmt.Errorf("clear backups in progress: %w", err)
	}
	return nil
}
