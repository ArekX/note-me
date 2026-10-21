package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
)

func (r *Repository) noteTagsColumn() string {
	return `(
	SELECT ` + fmt.Sprintf(r.dialect.groupConcat, `"note_tag"."name"`) + `
	FROM "note_tag"
	INNER JOIN "note_tag_note" ON "note_tag_note"."note_id" = "note"."id" AND "note_tag"."id" = "note_tag_note"."tag_id"
)`
}

// The viewer's own group_note row; notes shared with them have none.
const noteGroupJoin = `LEFT JOIN "group_note" ON "group_note"."note_id" = "note"."id" AND "group_note"."user_id" = ?
	LEFT JOIN "group" ON "group"."id" = "group_note"."group_id"`

func (r *Repository) CreateNote(ctx context.Context, note repository.NewNoteRecord) (*repository.NoteRecord, error) {
	record := &repository.NoteRecord{
		Title:       note.Title,
		Note:        note.Note,
		IsEncrypted: note.IsEncrypted,
		IsWide:      note.IsWide,
		UserId:      note.UserId,
		CreatedAt:   now(),
	}
	record.UpdatedAt = record.CreatedAt

	var err error
	record.Id, err = r.insert(
		ctx,
		`INSERT INTO "note" ("title", "note", "is_encrypted", "is_wide", "user_id", "created_at", "updated_at", "last_open_at")
		 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
		record.Title, record.Note, record.IsEncrypted, record.IsWide, record.UserId, record.CreatedAt, record.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create note: %w", err)
	}

	return record, nil
}

// groupId nil puts the note on the top level; the row is inserted either way.
func (r *Repository) AssignNoteToGroup(ctx context.Context, userId int, noteId int64, groupId *int64) error {
	if err := r.requireGroup(ctx, userId, groupId); err != nil {
		return err
	}

	_, err := r.q.ExecContext(
		ctx,
		`INSERT INTO "group_note" ("group_id", "note_id", "user_id") VALUES (?, ?, ?)`,
		groupId, noteId, userId,
	)
	if err != nil {
		return fmt.Errorf("assign note to group: %w", err)
	}

	return nil
}

func (r *Repository) UpdateNote(ctx context.Context, userId int, id int64, update repository.NoteUpdate) error {
	var sets []string
	var args []any
	if update.Title != nil || update.Note != nil || update.IsEncrypted != nil {
		sets = append(sets, `"updated_at" = ?`)
		args = append(args, now())
	}
	if update.Title != nil {
		sets = append(sets, `"title" = ?`)
		args = append(args, *update.Title)
	}
	if update.Note != nil {
		sets = append(sets, `"note" = ?`)
		args = append(args, *update.Note)
	}
	if update.IsEncrypted != nil {
		sets = append(sets, `"is_encrypted" = ?`)
		args = append(args, *update.IsEncrypted)
	}
	if update.IsWide != nil {
		sets = append(sets, `"is_wide" = ?`)
		args = append(args, *update.IsWide)
	}
	if len(sets) == 0 {
		return nil
	}

	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "note" SET `+strings.Join(sets, ", ")+` WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false`,
		append(args, id, userId)...,
	)
	if err != nil {
		return fmt.Errorf("update note: %w", err)
	}

	return nil
}

func (r *Repository) UpdateNoteParent(ctx context.Context, userId int, noteId int64, groupId *int64) error {
	if err := r.requireGroup(ctx, userId, groupId); err != nil {
		return err
	}

	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "group_note" SET "group_id" = ? WHERE "note_id" = ? AND "user_id" = ?`,
		groupId, noteId, userId,
	)
	if err != nil {
		return fmt.Errorf("update note parent: %w", err)
	}

	return nil
}

func (r *Repository) GetNote(ctx context.Context, userId int, id int64) (*repository.ViewNoteRecord, error) {
	var record repository.ViewNoteRecord
	var tags sql.NullString
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "note"."id", "note"."title", "note"."note", "note"."is_encrypted", "note"."is_wide", "group"."id", "group"."name", `+r.noteTagsColumn()+`, "note"."updated_at"
		 FROM "note" `+noteGroupJoin+`
		 WHERE "note"."id" = ? AND "note"."user_id" = ? AND "note"."is_deleted" = false`,
		userId, id, userId,
	).Scan(&record.Id, &record.Title, &record.Note, &record.IsEncrypted, &record.IsWide, &record.GroupId, &record.GroupName, &tags, &record.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get note: %w", err)
	}

	record.Tags = splitTags(tags)
	return &record, nil
}

func (r *Repository) UpdateLastOpenAt(ctx context.Context, userId int, noteId int64) error {
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "note" SET "last_open_at" = ? WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false`,
		now(), noteId, userId,
	)
	if err != nil {
		return fmt.Errorf("update note last open: %w", err)
	}

	return nil
}

func includeColumn(include bool, column, excluded string) string {
	if include {
		return column
	}
	return excluded
}

// Readable by the owner and by users the note is shared with. Excluded fields
// come back as 0 or an empty string like the original.
func (r *Repository) GetNoteDetails(ctx context.Context, userId int, noteId int64, options repository.NoteDetailsOptions) (*repository.NoteDetailsRecord, error) {
	columns := strings.Join([]string{
		includeColumn(options.IncludeGroup, `"group"."id"`, `0`),
		includeColumn(options.IncludeGroup, `"group"."name"`, `''`),
		includeColumn(options.IncludeTimestamp, `"note"."created_at"`, `0`),
		includeColumn(options.IncludeTimestamp, `"note"."updated_at"`, `0`),
		includeColumn(options.IncludeUser, `"user"."name"`, `''`),
		`"note"."is_encrypted"`,
		includeColumn(options.IncludeNote, `"note"."note"`, `''`),
		includeColumn(options.IncludeTitle, `"note"."title"`, `''`),
		`"note"."user_id"`,
		`"note"."is_deleted"`,
	}, ", ")

	var record repository.NoteDetailsRecord
	err := r.q.QueryRowContext(
		ctx,
		`SELECT `+columns+`
		 FROM "note" `+noteGroupJoin+`
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note"."id" = ? AND (
			("note"."is_deleted" = false AND (
				"note"."user_id" = ?
				OR EXISTS (SELECT 1 FROM "note_share_user" WHERE "note_id" = "note"."id" AND "user_id" = ?)
			))
			OR (? AND "note"."is_deleted" = true AND "note"."user_id" = ?)
		 )`,
		userId, noteId, userId, userId, options.IncludeDeleted, userId,
	).Scan(&record.GroupId, &record.GroupName, &record.CreatedAt, &record.UpdatedAt, &record.UserName, &record.IsEncrypted, &record.Note, &record.Title, &record.UserId, &record.IsDeleted)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get note details: %w", err)
	}

	return &record, nil
}

func (r *Repository) DeleteNote(ctx context.Context, userId int, noteId int64) error {
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "note" SET "is_deleted" = true, "deleted_at" = ? WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false`,
		now(), noteId, userId,
	)
	if err != nil {
		return fmt.Errorf("delete note: %w", err)
	}

	return nil
}

func (r *Repository) NoteExists(ctx context.Context, userId int, noteId int64, isDeleted bool) (bool, error) {
	var exists bool
	err := r.q.QueryRowContext(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM "note" WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = ?)`,
		noteId, userId, isDeleted,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check note exists: %w", err)
	}

	return exists, nil
}

func (r *Repository) FindRecentlyOpenedNotes(ctx context.Context, userId int) ([]repository.RecentNoteRecord, error) {
	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "note"."id", "note"."title", "group"."id", "group"."name", "note"."updated_at", "note"."last_open_at", "note"."is_encrypted"
		 FROM "note" `+noteGroupJoin+`
		 WHERE "note"."user_id" = ? AND "note"."is_deleted" = false
		 ORDER BY "note"."last_open_at" IS NULL, "note"."last_open_at" DESC
		 LIMIT 5`,
		userId, userId,
	)
	if err != nil {
		return nil, fmt.Errorf("find recently opened notes: %w", err)
	}
	defer rows.Close()

	records := []repository.RecentNoteRecord{}
	for rows.Next() {
		var record repository.RecentNoteRecord
		if err := rows.Scan(&record.Id, &record.Title, &record.GroupId, &record.GroupName, &record.UpdatedAt, &record.LastOpenAt, &record.IsEncrypted); err != nil {
			return nil, fmt.Errorf("scan recently opened note: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read recently opened notes: %w", err)
	}

	return records, nil
}

func (r *Repository) FindDeletedNotes(ctx context.Context, userId int, fromId int64) ([]repository.DeletedNoteRecord, error) {
	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "id", "title", "is_encrypted", "deleted_at" FROM "note"
		 WHERE "user_id" = ? AND "is_deleted" = true AND "id" > ?
		 ORDER BY "id"
		 LIMIT 10`,
		userId, fromId,
	)
	if err != nil {
		return nil, fmt.Errorf("find deleted notes: %w", err)
	}
	return scanDeletedNotes(rows)
}

func scanDeletedNotes(rows *sql.Rows) ([]repository.DeletedNoteRecord, error) {
	defer rows.Close()

	records := []repository.DeletedNoteRecord{}
	for rows.Next() {
		var record repository.DeletedNoteRecord
		if err := rows.Scan(&record.Id, &record.Title, &record.IsEncrypted, &record.DeletedAt); err != nil {
			return nil, fmt.Errorf("scan deleted note: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read deleted notes: %w", err)
	}

	return records, nil
}

// Removes the notes with every row that points at them (0.9.f adds
// note_share_user and the notifications to the original's list).
func (r *Repository) FullyDeleteNotes(ctx context.Context, noteIds []int64) error {
	if len(noteIds) == 0 {
		return nil
	}

	args := make([]any, len(noteIds))
	for i, id := range noteIds {
		args[i] = id
	}
	in := `(` + placeholders(len(noteIds)) + `)`

	err := r.runInTransaction(ctx, func(tx *Repository) error {
		for _, table := range []string{"note_tag_note", "group_note", "note_history", "note_reminder", "note_share_link", "note_share_user"} {
			if _, err := tx.q.ExecContext(ctx, `DELETE FROM "`+table+`" WHERE "note_id" IN `+in, args...); err != nil {
				return err
			}
		}
		if _, err := tx.q.ExecContext(ctx, `DELETE FROM "notification" WHERE `+r.dialect.notificationNoteId+` IN `+in, args...); err != nil {
			return err
		}
		_, err := tx.q.ExecContext(ctx, `DELETE FROM "note" WHERE "id" IN `+in, args...)
		return err
	})
	if err != nil {
		return fmt.Errorf("fully delete notes: %w", err)
	}

	return nil
}

func (r *Repository) RemoveExpiredDeletedNotes(ctx context.Context, days int) ([]repository.RemovedNote, error) {
	var removed []repository.RemovedNote
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		rows, err := tx.q.QueryContext(
			ctx,
			`SELECT "id", "user_id" FROM "note" WHERE "is_deleted" = true AND "deleted_at" < ? ORDER BY "id"`,
			now()-int64(days)*24*60*60,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		removed = []repository.RemovedNote{}
		ids := []int64{}
		for rows.Next() {
			var note repository.RemovedNote
			if err := rows.Scan(&note.Id, &note.UserId); err != nil {
				return err
			}
			removed = append(removed, note)
			ids = append(ids, note.Id)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		rows.Close()

		return tx.FullyDeleteNotes(ctx, ids)
	})
	if err != nil {
		return nil, fmt.Errorf("remove expired deleted notes: %w", err)
	}

	return removed, nil
}

// The note's groups may be gone, so it comes back on the top level (0.9.g).
func (r *Repository) RestoreDeletedNote(ctx context.Context, userId int, noteId int64) (bool, error) {
	var restored bool
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		result, err := tx.q.ExecContext(
			ctx,
			`UPDATE "note" SET "is_deleted" = false, "deleted_at" = NULL WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = true`,
			noteId, userId,
		)
		if err != nil {
			return err
		}
		count, err := result.RowsAffected()
		if err != nil || count == 0 {
			return err
		}
		restored = true

		if _, err := tx.q.ExecContext(ctx, `DELETE FROM "group_note" WHERE "note_id" = ? AND "user_id" = ?`, noteId, userId); err != nil {
			return err
		}
		_, err = tx.q.ExecContext(ctx, `INSERT INTO "group_note" ("group_id", "note_id", "user_id") VALUES (NULL, ?, ?)`, noteId, userId)
		return err
	})
	if err != nil {
		return false, fmt.Errorf("restore deleted note: %w", err)
	}

	return restored, nil
}

func (r *Repository) GetUserNoteCount(ctx context.Context, userId int) (int, error) {
	var count int
	err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "note" WHERE "user_id" = ? AND "is_deleted" = false`, userId).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get user note count: %w", err)
	}
	return count, nil
}
