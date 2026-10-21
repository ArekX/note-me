package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"noteme/internal/components/repository"
)

func (r *Repository) SessionExists(ctx context.Context, key string) (bool, error) {
	var one int

	err := r.q.QueryRowContext(
		ctx,
		`SELECT 1 FROM "session" WHERE "key" = ? AND "expires_at" > ? LIMIT 1`,
		key,
		time.Now().UnixMilli(),
	).Scan(&one)

	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}

	if err != nil {
		return false, fmt.Errorf("check session exists: %w", err)
	}

	return true, nil
}

func (r *Repository) GetSessionByUserId(ctx context.Context, userId int) (*repository.SessionRecord, error) {
	var record repository.SessionRecord

	err := r.q.QueryRowContext(ctx, `SELECT "key", "data", "user_id"
		 FROM "session"
		 WHERE "user_id" = ? AND "expires_at" > ?
		 ORDER BY "expires_at" DESC
		 LIMIT 1`,
		userId,
		time.Now().UnixMilli(),
	).Scan(
		&record.Key,
		&record.Data,
		&record.UserId,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get session by user id: %w", err)
	}

	return &record, nil
}

func (r *Repository) DeleteSessionByUserId(ctx context.Context, userId int) error {
	_, err := r.q.ExecContext(ctx, `DELETE FROM "session" WHERE "user_id" = ?`, userId)

	if err != nil {
		return fmt.Errorf("delete session by user id: %w", err)
	}

	return nil
}

func (r *Repository) DeleteOtherSessions(ctx context.Context, userId int, keepKey string) error {
	_, err := r.q.ExecContext(ctx, `DELETE FROM "session" WHERE "user_id" = ? AND "key" != ?`, userId, keepKey)

	if err != nil {
		return fmt.Errorf("delete other sessions: %w", err)
	}

	return nil
}

func (r *Repository) DeleteExpiredSessions(ctx context.Context) error {
	_, err := r.q.ExecContext(
		ctx,
		`DELETE FROM "session" WHERE "expires_at" < ?`,
		time.Now().UnixMilli(),
	)
	if err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}

	return nil
}

func (r *Repository) UpdateSessionData(ctx context.Context, key string, data []byte) error {
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "session" SET "data" = ? WHERE "key" = ?`,
		string(data),
		key,
	)
	if err != nil {
		return fmt.Errorf("update session data: %w", err)
	}

	return nil
}

func (r *Repository) UpdateUserSessionsData(ctx context.Context, userId int, data []byte) error {
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "session" SET "data" = ? WHERE "user_id" = ?`,
		string(data),
		userId,
	)
	if err != nil {
		return fmt.Errorf("update user sessions data: %w", err)
	}

	return nil
}

func (r *Repository) CreateNewSession(ctx context.Context, record repository.NewSessionRecord) (int64, error) {
	id, err := r.insert(
		ctx,
		`INSERT INTO "session" ("key", "user_id", "expires_at", "data")
		 VALUES (?, ?, ?, ?)`,
		record.Key,
		record.UserId,
		record.ExpiresAt,
		string(record.Data),
	)
	if err != nil {
		return 0, fmt.Errorf("create new session: %w", err)
	}

	return id, nil
}

func (r *Repository) GetSessionByKey(ctx context.Context, key string) (*repository.SessionRecord, error) {
	var record repository.SessionRecord

	err := r.q.QueryRowContext(ctx, `SELECT "key", "data", "user_id"
		 FROM "session"
		 WHERE "key" = ? AND "expires_at" > ?
		 ORDER BY "expires_at" DESC
		 LIMIT 1`,
		key,
		time.Now().UnixMilli(),
	).Scan(
		&record.Key,
		&record.Data,
		&record.UserId,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get session by key: %w", err)
	}

	return &record, nil
}
