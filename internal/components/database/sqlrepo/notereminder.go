package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

// A reminder fires at a whole minute; a repeating one first fires one
// interval from now. Setting it again keeps done_count, as in the original.
func (r *Repository) SetReminder(ctx context.Context, userId int, noteId int64, reminder repository.Reminder) (*repository.SetReminderResult, error) {
	result := &repository.SetReminderResult{NextAt: reminder.NextAt}
	if !reminder.Once {
		result.NextAt = now() + reminder.Interval*reminder.UnitValue
		result.Interval = &reminder.Interval
		result.UnitValue = &reminder.UnitValue
		result.RepeatCount = reminder.RepeatCount
	}
	result.NextAt -= result.NextAt % 60

	_, err := r.q.ExecContext(
		ctx,
		r.dialect.upsert(
			`INSERT INTO "note_reminder" ("note_id", "user_id", "next_at", "interval", "unit_value", "repeat_count", "done_count")
			 VALUES (?, ?, ?, ?, ?, ?, 0)`,
			[]string{"note_id", "user_id"}, []string{"next_at", "interval", "unit_value", "repeat_count"}),
		noteId, userId, result.NextAt, result.Interval, result.UnitValue, result.RepeatCount,
	)
	if err != nil {
		return nil, fmt.Errorf("set reminder: %w", err)
	}

	return result, nil
}

func (r *Repository) RemoveReminder(ctx context.Context, userId int, noteId int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "note_reminder" WHERE "note_id" = ? AND "user_id" = ?`, noteId, userId); err != nil {
		return fmt.Errorf("remove reminder: %w", err)
	}
	return nil
}

// A reminder only counts while its user owns the note or still has it shared;
// a revoked recipient's row is deleted, this guards the window in between.
const reminderUserHasNote = `("note"."user_id" = "note_reminder"."user_id"
	OR EXISTS (SELECT 1 FROM "note_share_user" WHERE "note_id" = "note"."id" AND "user_id" = "note_reminder"."user_id"))`

const reminderNoteColumns = `"note_reminder"."id", "note_reminder"."note_id", "note"."title", "note"."is_encrypted",
	"note"."user_id", "user"."name",
	(CASE WHEN "note_reminder"."interval" IS NULL THEN 'once' ELSE 'repeat' END),
	"note_reminder"."done_count", "note_reminder"."interval", "note_reminder"."unit_value",
	"note_reminder"."repeat_count", "note_reminder"."next_at"`

func scanReminderNotes(rows *sql.Rows) ([]repository.ReminderNoteRecord, error) {
	defer rows.Close()

	records := []repository.ReminderNoteRecord{}
	for rows.Next() {
		var record repository.ReminderNoteRecord
		if err := rows.Scan(&record.Id, &record.NoteId, &record.Title, &record.IsEncrypted, &record.AuthorId, &record.AuthorName,
			&record.Type, &record.DoneCount, &record.Interval, &record.UnitValue, &record.RepeatCount, &record.NextAt); err != nil {
			return nil, fmt.Errorf("scan reminder: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read reminders: %w", err)
	}

	return records, nil
}

const maxReminderPage = 10

func (r *Repository) FindUserReminderNotes(ctx context.Context, userId int, filters repository.ReminderFilters) ([]repository.ReminderNoteRecord, error) {
	limit := maxReminderPage
	if filters.Limit > 0 && filters.Limit < limit {
		limit = filters.Limit
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT `+reminderNoteColumns+`
		 FROM "note_reminder"
		 INNER JOIN "note" ON "note"."id" = "note_reminder"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note_reminder"."user_id" = ? AND "note"."is_deleted" = false AND `+reminderUserHasNote+`
		   AND ("note_reminder"."next_at" > ? OR ("note_reminder"."next_at" = ? AND "note_reminder"."id" > ?))
		 ORDER BY "note_reminder"."next_at", "note_reminder"."id"
		 LIMIT ?`,
		userId, filters.FromNextAt, filters.FromNextAt, filters.FromId, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("find reminders: %w", err)
	}
	return scanReminderNotes(rows)
}

func (r *Repository) GetNoteReminderData(ctx context.Context, userId int, noteId int64) (*repository.NoteReminderData, error) {
	var record repository.NoteReminderData
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "id", "next_at", "interval", "unit_value", "repeat_count", "done_count" FROM "note_reminder" WHERE "note_id" = ? AND "user_id" = ?`,
		noteId, userId,
	).Scan(&record.Id, &record.NextAt, &record.Interval, &record.UnitValue, &record.RepeatCount, &record.DoneCount)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get reminder: %w", err)
	}

	return &record, nil
}

// Reminders of deleted notes wait until the note is restored (0.9.h).
func (r *Repository) GetReadyReminders(ctx context.Context) ([]repository.ReadyReminder, error) {
	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "note_reminder"."id", "note_reminder"."note_id", "note_reminder"."user_id"
		 FROM "note_reminder"
		 INNER JOIN "note" ON "note"."id" = "note_reminder"."note_id" AND "note"."is_deleted" = false
		 WHERE "note_reminder"."next_at" <= ? AND `+reminderUserHasNote+`
		 ORDER BY "note_reminder"."id"`,
		now(),
	)
	if err != nil {
		return nil, fmt.Errorf("get ready reminders: %w", err)
	}
	defer rows.Close()

	reminders := []repository.ReadyReminder{}
	for rows.Next() {
		var reminder repository.ReadyReminder
		if err := rows.Scan(&reminder.Id, &reminder.NoteId, &reminder.UserId); err != nil {
			return nil, fmt.Errorf("scan ready reminder: %w", err)
		}
		reminders = append(reminders, reminder)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read ready reminders: %w", err)
	}

	return reminders, nil
}

// A one-off reminder (repeat_count 0) is removed after it fires; a repeating
// one is removed once it has fired repeat_count times. The next run is one
// interval from now, not from the previous run (0.9.m).
func (r *Repository) ResolveReminderNextOccurrence(ctx context.Context, id int64) error {
	var doneCount, repeatCount int64
	var interval, unitValue *int64
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "done_count", "repeat_count", "interval", "unit_value" FROM "note_reminder" WHERE "id" = ?`,
		id,
	).Scan(&doneCount, &repeatCount, &interval, &unitValue)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get reminder occurrence: %w", err)
	}

	doneCount++
	if doneCount >= repeatCount {
		_, err = r.q.ExecContext(ctx, `DELETE FROM "note_reminder" WHERE "id" = ?`, id)
	} else {
		_, err = r.q.ExecContext(
			ctx,
			`UPDATE "note_reminder" SET "done_count" = ?, "next_at" = ? WHERE "id" = ?`,
			doneCount, now()+*interval**unitValue, id,
		)
	}
	if err != nil {
		return fmt.Errorf("resolve reminder occurrence: %w", err)
	}

	return nil
}

func (r *Repository) SearchReminderNotes(ctx context.Context, userId int, filters repository.SearchFilters) ([]repository.ReminderNoteRecord, error) {
	ids, idArgs, err := r.searchNoteIds(ctx, userId, filters,
		`"note"."is_deleted" = false AND "note"."id" IN (SELECT "note_id" FROM "note_reminder" WHERE "user_id" = ?)
		 AND ("note"."user_id" = ? OR "note"."id" IN (SELECT "note_id" FROM "note_share_user" WHERE "user_id" = ?))`, userId, userId, userId)
	if err != nil {
		return nil, err
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT `+reminderNoteColumns+`
		 FROM "note_reminder"
		 INNER JOIN "note" ON "note"."id" = "note_reminder"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note"."id" IN (`+ids+`) AND "note_reminder"."user_id" = ? AND `+reminderUserHasNote+`
		 ORDER BY "note"."id"`,
		append(idArgs, userId)...,
	)
	if err != nil {
		return nil, fmt.Errorf("search reminders: %w", err)
	}
	return scanReminderNotes(rows)
}

// No owner check: reminders on shared notes need the author's data.
func (r *Repository) GetNoteInfo(ctx context.Context, noteId int64) (*repository.NoteInfoRecord, error) {
	var record repository.NoteInfoRecord
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "note"."id", "note"."title", "note"."is_encrypted", "user"."name", "user"."id"
		 FROM "note" INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note"."id" = ? AND "note"."is_deleted" = false`,
		noteId,
	).Scan(&record.Id, &record.Title, &record.IsEncrypted, &record.UserName, &record.UserId)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get note info: %w", err)
	}

	return &record, nil
}
