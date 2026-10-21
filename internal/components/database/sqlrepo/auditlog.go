package sqlrepo

import (
	"context"
	"database/sql"
	"fmt"

	"noteme/internal/components/repository"
)

func (r *Repository) CreateAuditEntry(ctx context.Context, entry repository.AuditEntry) error {
	_, err := r.q.ExecContext(
		ctx,
		`INSERT INTO "audit_log" ("created_at", "event", "user_id", "username", "address", "details") VALUES (?, ?, ?, ?, ?, ?)`,
		now(), entry.Event, entry.UserId, nullString(entry.Username), nullString(entry.Address), entry.Details,
	)
	if err != nil {
		return fmt.Errorf("create audit entry: %w", err)
	}
	return nil
}

func nullString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func (r *Repository) FindAuditEntries(ctx context.Context, filters repository.AuditFilters, page int) (*repository.Paged[repository.AuditRecord], error) {
	from := `"audit_log" WHERE 1 = 1`
	args := []any{}
	if filters.Event != "" {
		from += ` AND "event" = ?`
		args = append(args, filters.Event)
	}
	if filters.Username != "" {
		from += ` AND ` + r.dialect.likeCondition(`"username"`)
		args = append(args, likeContains(filters.Username))
	}
	if filters.From > 0 {
		from += ` AND "created_at" >= ?`
		args = append(args, filters.From)
	}
	if filters.To > 0 {
		from += ` AND "created_at" <= ?`
		args = append(args, filters.To)
	}

	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"id", "created_at", "event", "user_id", "username", "address", "details"`,
		From:    from,
		OrderBy: `"created_at" DESC, "id" DESC`,
		Args:    args,
		Page:    page,
	}, func(rows *sql.Rows) (repository.AuditRecord, error) {
		var record repository.AuditRecord
		var userId sql.NullInt64
		var username, address sql.NullString
		err := rows.Scan(&record.Id, &record.CreatedAt, &record.Event, &userId, &username, &address, &record.Details)
		if userId.Valid {
			id := int(userId.Int64)
			record.UserId = &id
		}
		record.Username = username.String
		record.Address = address.String
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find audit entries: %w", err)
	}
	return records, nil
}

func (r *Repository) FindAuditEvents(ctx context.Context) ([]string, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT DISTINCT "event" FROM "audit_log" ORDER BY "event"`)
	if err != nil {
		return nil, fmt.Errorf("find audit events: %w", err)
	}
	defer rows.Close()

	events := []string{}
	for rows.Next() {
		var event string
		if err := rows.Scan(&event); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (r *Repository) DeleteAuditEntriesBefore(ctx context.Context, createdBefore int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "audit_log" WHERE "created_at" < ?`, createdBefore); err != nil {
		return fmt.Errorf("delete audit entries: %w", err)
	}
	return nil
}
