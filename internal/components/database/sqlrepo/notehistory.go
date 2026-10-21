package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
)

// Snapshots the note as it is now, before an update changes it. Version
// numbers count the existing rows, as in the original, so a deleted version's
// number can come back.
func (r *Repository) AddHistory(ctx context.Context, userId int, noteId int64, isReversal bool) error {
	note, err := r.GetNote(ctx, userId, noteId)
	if err != nil {
		return err
	}
	if note == nil {
		return repository.ErrNoteNotFound
	}

	var count int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note_history" WHERE "note_id" = ?`, noteId).Scan(&count); err != nil {
		return fmt.Errorf("count note history: %w", err)
	}

	version := fmt.Sprintf("Version %d", count+1)
	if isReversal {
		version += " (before reversal)"
	}

	_, err = r.q.ExecContext(
		ctx,
		`INSERT INTO "note_history" ("note_id", "version", "title", "tags", "note", "is_encrypted", "created_at") VALUES (?, ?, ?, ?, ?, ?, ?)`,
		noteId, version, note.Title, strings.Join(note.Tags, ","), note.Note, note.IsEncrypted, now(),
	)
	if err != nil {
		return fmt.Errorf("add note history: %w", err)
	}

	return nil
}

func (r *Repository) FindHistory(ctx context.Context, userId int, noteId int64, page int) (*repository.Paged[repository.NoteHistoryMetaRecord], error) {
	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"note_history"."id", "note_history"."version", "note_history"."created_at", "note_history"."is_encrypted"`,
		From: `"note_history"
			INNER JOIN "note" ON "note"."id" = "note_history"."note_id" AND "note"."user_id" = ?
			WHERE "note_history"."note_id" = ?`,
		OrderBy: `"note_history"."created_at" DESC, "note_history"."id" DESC`,
		Args:    []any{userId, noteId},
		Page:    page,
	}, func(rows *sql.Rows) (repository.NoteHistoryMetaRecord, error) {
		var record repository.NoteHistoryMetaRecord
		err := rows.Scan(&record.Id, &record.Version, &record.CreatedAt, &record.IsEncrypted)
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find note history: %w", err)
	}

	return records, nil
}

func (r *Repository) GetHistoryRecordData(ctx context.Context, userId int, id int64) (*repository.NoteHistoryDataRecord, error) {
	var record repository.NoteHistoryDataRecord
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "note_history"."note_id", "note_history"."version", "note_history"."note", "note_history"."title", "note_history"."is_encrypted", "note_history"."tags"
		 FROM "note_history"
		 INNER JOIN "note" ON "note"."id" = "note_history"."note_id" AND "note"."user_id" = ?
		 WHERE "note_history"."id" = ?`,
		userId, id,
	).Scan(&record.NoteId, &record.Version, &record.Note, &record.Title, &record.IsEncrypted, &record.Tags)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get note history data: %w", err)
	}

	return &record, nil
}

func (r *Repository) DeleteHistoryRecord(ctx context.Context, noteId int64, id int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "note_history" WHERE "id" = ? AND "note_id" = ?`, id, noteId); err != nil {
		return fmt.Errorf("delete note history: %w", err)
	}
	return nil
}
