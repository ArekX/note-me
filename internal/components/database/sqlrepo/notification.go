package sqlrepo

import (
	"context"
	"fmt"

	"noteme/internal/components/repository"
)

func (r *Repository) CreateNotification(ctx context.Context, userId int, data string) (*repository.NotificationRecord, error) {
	record := &repository.NotificationRecord{Data: data, CreatedAt: now(), UserId: userId}
	var err error
	record.Id, err = r.insert(
		ctx,
		`INSERT INTO "notification" ("data", "created_at", "is_read", "is_deleted", "user_id") VALUES (?, ?, false, false, ?)`,
		data, record.CreatedAt, userId,
	)
	if err != nil {
		return nil, fmt.Errorf("create notification: %w", err)
	}
	return record, nil
}

func (r *Repository) GetUserNotifications(ctx context.Context, userId int) ([]repository.NotificationRecord, error) {
	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "id", "data", "created_at", "is_read", "user_id" FROM "notification"
		 WHERE "user_id" = ? AND "is_deleted" = false
		 ORDER BY "created_at" DESC, "id" DESC`,
		userId,
	)
	if err != nil {
		return nil, fmt.Errorf("get notifications: %w", err)
	}
	defer rows.Close()

	records := []repository.NotificationRecord{}
	for rows.Next() {
		var record repository.NotificationRecord
		if err := rows.Scan(&record.Id, &record.Data, &record.CreatedAt, &record.IsRead, &record.UserId); err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read notifications: %w", err)
	}

	return records, nil
}

func (r *Repository) DeleteUserNotifications(ctx context.Context, userId int) error {
	return r.execNotification(ctx, "delete notifications", `UPDATE "notification" SET "is_deleted" = true WHERE "user_id" = ?`, userId)
}

func (r *Repository) DeleteSingleNotification(ctx context.Context, userId int, id int64) error {
	return r.execNotification(ctx, "delete notification", `UPDATE "notification" SET "is_deleted" = true WHERE "user_id" = ? AND "id" = ?`, userId, id)
}

func (r *Repository) MarkReadUserNotifications(ctx context.Context, userId int) error {
	return r.execNotification(ctx, "mark notifications read", `UPDATE "notification" SET "is_read" = true WHERE "user_id" = ?`, userId)
}

func (r *Repository) MarkSingleNotificationRead(ctx context.Context, userId int, id int64) error {
	return r.execNotification(ctx, "mark notification read", `UPDATE "notification" SET "is_read" = true WHERE "user_id" = ? AND "id" = ?`, userId, id)
}

func (r *Repository) execNotification(ctx context.Context, action, query string, args ...any) error {
	if _, err := r.q.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("%s: %w", action, err)
	}
	return nil
}
