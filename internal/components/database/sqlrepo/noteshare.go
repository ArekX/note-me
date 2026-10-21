package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"slices"
	"strings"

	"github.com/google/uuid"
	"noteme/internal/components/repository"
)

func (r *Repository) sharedNoteColumns() string {
	return `"note"."id", "note"."title", "note"."note", "note"."is_encrypted", "note"."is_wide", ` + r.noteTagsColumn() + `, "note"."updated_at", "user"."name"`
}

func scanSharedNote(row *sql.Row) (*repository.SharedNoteRecord, error) {
	var record repository.SharedNoteRecord
	var tags sql.NullString
	err := row.Scan(&record.Id, &record.Title, &record.Note, &record.IsEncrypted, &record.IsWide, &tags, &record.UpdatedAt, &record.UserName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	record.Tags = splitTags(tags)
	return &record, nil
}

// Deleted notes are not shared (0.9.h).
func (r *Repository) GetPublicShareNote(ctx context.Context, identifier string) (*repository.SharedNoteRecord, error) {
	record, err := scanSharedNote(r.q.QueryRowContext(
		ctx,
		`SELECT `+r.sharedNoteColumns()+`
		 FROM "note_share_link"
		 INNER JOIN "note" ON "note"."id" = "note_share_link"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note_share_link"."identifier" = ? AND "note"."is_deleted" = false
		   AND ("note_share_link"."expires_at" IS NULL OR "note_share_link"."expires_at" > ?)`,
		identifier, now(),
	))
	if err != nil {
		return nil, fmt.Errorf("get public share note: %w", err)
	}
	return record, nil
}

func (r *Repository) GetUserShareNote(ctx context.Context, userId int, noteId int64) (*repository.SharedNoteRecord, error) {
	record, err := scanSharedNote(r.q.QueryRowContext(
		ctx,
		`SELECT `+r.sharedNoteColumns()+`
		 FROM "note_share_user"
		 INNER JOIN "note" ON "note"."id" = "note_share_user"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note_share_user"."note_id" = ? AND "note_share_user"."user_id" = ? AND "note"."is_deleted" = false`,
		noteId, userId,
	))
	if err != nil {
		return nil, fmt.Errorf("get user share note: %w", err)
	}
	return record, nil
}

func (r *Repository) CreatePublicShare(ctx context.Context, noteId int64, expiresAt *int64) (*repository.PublicShareRecord, error) {
	record := &repository.PublicShareRecord{NoteId: noteId, Identifier: uuid.NewString(), CreatedAt: now(), ExpiresAt: expiresAt}
	var err error
	record.Id, err = r.insert(
		ctx,
		`INSERT INTO "note_share_link" ("identifier", "note_id", "created_at", "expires_at") VALUES (?, ?, ?, ?)`,
		record.Identifier, noteId, record.CreatedAt, expiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create public share: %w", err)
	}
	return record, nil
}

func (r *Repository) RemovePublicShare(ctx context.Context, noteId int64, id int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "note_share_link" WHERE "id" = ? AND "note_id" = ?`, id, noteId); err != nil {
		return fmt.Errorf("remove public share: %w", err)
	}
	return nil
}

// Replaces the users the note is shared with and returns the ones that were
// not on the list before. Ids of missing users and of the owner are ignored.
// A removed user also loses their reminder and notifications for the note.
func (r *Repository) SetUserShare(ctx context.Context, ownerId int, noteId int64, userIds []int64) ([]int64, error) {
	added := []int64{}
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		existing, err := queryIds(ctx, tx.q, `SELECT "user_id" FROM "note_share_user" WHERE "note_id" = ?`, noteId)
		if err != nil {
			return err
		}

		wanted := []int64{}
		if len(userIds) > 0 {
			args := []any{ownerId}
			for _, id := range userIds {
				args = append(args, id)
			}
			wanted, err = queryIds(ctx, tx.q,
				`SELECT "id" FROM "user" WHERE "id" != ? AND "id" IN (`+placeholders(len(userIds))+`) ORDER BY "id"`,
				args...)
			if err != nil {
				return err
			}
		}

		for _, id := range wanted {
			if slices.Contains(existing, id) {
				continue
			}
			created, err := tx.insertIfAbsent(ctx,
				`INSERT INTO "note_share_user" ("note_id", "user_id", "created_at") VALUES (?, ?, ?)`,
				[]string{"note_id", "user_id"}, noteId, id, now())
			if err != nil {
				return err
			}
			if created {
				added = append(added, id)
			}
		}
		for _, id := range existing {
			if slices.Contains(wanted, id) {
				continue
			}
			for _, statement := range []string{
				`DELETE FROM "note_share_user" WHERE "note_id" = ? AND "user_id" = ?`,
				`DELETE FROM "note_reminder" WHERE "note_id" = ? AND "user_id" = ?`,
				`DELETE FROM "notification" WHERE ` + r.dialect.notificationNoteId + ` = ? AND "user_id" = ?`,
			} {
				if _, err := tx.q.ExecContext(ctx, statement, noteId, id); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("set user share: %w", err)
	}
	return added, nil
}

func (r *Repository) GetNoteShareData(ctx context.Context, noteId int64) (*repository.NoteShareData, error) {
	data := &repository.NoteShareData{Users: []repository.PickUserRecord{}, Links: []repository.PublicShareRecord{}}

	users, err := r.q.QueryContext(
		ctx,
		`SELECT "user"."id", "user"."name", "user"."username" FROM "note_share_user"
		 INNER JOIN "user" ON "user"."id" = "note_share_user"."user_id"
		 WHERE "note_share_user"."note_id" = ?
		 ORDER BY "note_share_user"."id"`,
		noteId,
	)
	if err != nil {
		return nil, fmt.Errorf("get note share users: %w", err)
	}
	defer users.Close()
	for users.Next() {
		var user repository.PickUserRecord
		if err := users.Scan(&user.Id, &user.Name, &user.Username); err != nil {
			return nil, fmt.Errorf("scan note share user: %w", err)
		}
		data.Users = append(data.Users, user)
	}
	if err := users.Err(); err != nil {
		return nil, fmt.Errorf("read note share users: %w", err)
	}
	users.Close()

	links, err := r.q.QueryContext(
		ctx,
		`SELECT "id", "note_id", "identifier", "created_at", "expires_at" FROM "note_share_link"
		 WHERE "note_id" = ? ORDER BY "created_at" DESC, "id" DESC`,
		noteId,
	)
	if err != nil {
		return nil, fmt.Errorf("get note share links: %w", err)
	}
	defer links.Close()
	for links.Next() {
		var link repository.PublicShareRecord
		if err := links.Scan(&link.Id, &link.NoteId, &link.Identifier, &link.CreatedAt, &link.ExpiresAt); err != nil {
			return nil, fmt.Errorf("scan note share link: %w", err)
		}
		data.Links = append(data.Links, link)
	}
	if err := links.Err(); err != nil {
		return nil, fmt.Errorf("read note share links: %w", err)
	}

	return data, nil
}

const userSharedNoteColumns = `"note"."id", "note_share_user"."id", "note"."title", "note"."is_encrypted", "user"."name", "note_share_user"."created_at"`

func scanUserSharedNotes(rows *sql.Rows) ([]repository.UserSharedNoteRecord, error) {
	defer rows.Close()

	records := []repository.UserSharedNoteRecord{}
	for rows.Next() {
		var record repository.UserSharedNoteRecord
		if err := rows.Scan(&record.Id, &record.ShareId, &record.Title, &record.IsEncrypted, &record.UserName, &record.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan shared note: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read shared notes: %w", err)
	}

	return records, nil
}

const maxSharedNotesPage = 10

// Newest share first; the original's LIMIT min(limit, 1) returned one row
// (0.9.a), here it is min(limit, 10).
func (r *Repository) FindUserSharedNotes(ctx context.Context, userId int, filters repository.SharedNotesFilters) ([]repository.UserSharedNoteRecord, error) {
	limit := maxSharedNotesPage
	if filters.Limit > 0 && filters.Limit < limit {
		limit = filters.Limit
	}
	fromCreatedAt := now()
	if filters.FromCreatedAt != nil {
		fromCreatedAt = *filters.FromCreatedAt
	}
	fromShareId := int64(math.MaxInt64)
	if filters.FromShareId != nil {
		fromShareId = *filters.FromShareId
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT `+userSharedNoteColumns+`
		 FROM "note_share_user"
		 INNER JOIN "note" ON "note"."id" = "note_share_user"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note_share_user"."user_id" = ? AND "note"."is_deleted" = false
		   AND ("note_share_user"."created_at" < ? OR ("note_share_user"."created_at" = ? AND "note_share_user"."id" < ?))
		 ORDER BY "note_share_user"."created_at" DESC, "note_share_user"."id" DESC
		 LIMIT ?`,
		userId, fromCreatedAt, fromCreatedAt, fromShareId, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("find shared notes: %w", err)
	}
	return scanUserSharedNotes(rows)
}

func (r *Repository) SearchSharedNotes(ctx context.Context, userId int, filters repository.SearchFilters) ([]repository.UserSharedNoteRecord, error) {
	ids, idArgs, err := r.searchNoteIds(ctx, userId, filters,
		`"note"."is_deleted" = false AND "note"."id" IN (SELECT "note_id" FROM "note_share_user" WHERE "user_id" = ?)`, userId)
	if err != nil {
		return nil, err
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT `+userSharedNoteColumns+`
		 FROM "note_share_user"
		 INNER JOIN "note" ON "note"."id" = "note_share_user"."note_id"
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note"."id" IN (`+ids+`) AND "note_share_user"."user_id" = ?
		 ORDER BY "note"."id"`,
		append(idArgs, userId)...,
	)
	if err != nil {
		return nil, fmt.Errorf("search shared notes: %w", err)
	}
	return scanUserSharedNotes(rows)
}

func (r *Repository) RemoveExpiredPublicShares(ctx context.Context) ([]repository.ExpiredPublicShare, error) {
	expired := []repository.ExpiredPublicShare{}
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		before := now()
		rows, err := tx.q.QueryContext(ctx,
			`SELECT DISTINCT "note"."id", "note"."user_id" FROM "note_share_link"
			 INNER JOIN "note" ON "note"."id" = "note_share_link"."note_id"
			 WHERE "note_share_link"."expires_at" < ?
			 ORDER BY "note"."id"`,
			before)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var share repository.ExpiredPublicShare
			if err := rows.Scan(&share.NoteId, &share.OwnerId); err != nil {
				return err
			}
			expired = append(expired, share)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		rows.Close()

		_, err = tx.q.ExecContext(ctx, `DELETE FROM "note_share_link" WHERE "expires_at" < ?`, before)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("remove expired public shares: %w", err)
	}
	return expired, nil
}

func (r *Repository) FindNoteShareUserIds(ctx context.Context, noteIds []int64) ([]int, error) {
	if len(noteIds) == 0 {
		return []int{}, nil
	}
	args := make([]any, 0, len(noteIds))
	for _, id := range noteIds {
		args = append(args, id)
	}
	ids, err := queryIds(ctx, r.q,
		`SELECT DISTINCT "user_id" FROM "note_share_user" WHERE "note_id" IN (`+placeholders(len(noteIds))+`) ORDER BY "user_id"`,
		args...)
	if err != nil {
		return nil, fmt.Errorf("find note share users: %w", err)
	}
	userIds := make([]int, 0, len(ids))
	for _, id := range ids {
		userIds = append(userIds, int(id))
	}
	return userIds, nil
}

func (r *Repository) SharedNoteWithUser(ctx context.Context, userId int, noteId int64) (bool, error) {
	var shared bool
	err := r.q.QueryRowContext(
		ctx,
		`SELECT EXISTS (
			SELECT 1 FROM "note_share_user"
			INNER JOIN "note" ON "note"."id" = "note_share_user"."note_id" AND "note"."is_deleted" = false
			WHERE "note_share_user"."note_id" = ? AND "note_share_user"."user_id" = ?
		)`,
		noteId, userId,
	).Scan(&shared)
	if err != nil {
		return false, fmt.Errorf("check shared note: %w", err)
	}
	return shared, nil
}

const pickUsersPerPage = 5

func (r *Repository) FindPickerUsers(ctx context.Context, filters repository.PickUserFilters, page int) (*repository.Paged[repository.PickUserRecord], error) {
	from := `"user" WHERE 1 = 1`
	args := []any{}
	if filters.Name != "" {
		from += ` AND ` + r.dialect.likeCondition(`"name"`)
		args = append(args, likeContains(filters.Name))
	}
	if filters.Username != "" {
		from += ` AND ` + r.dialect.likeCondition(`"username"`)
		args = append(args, likeContains(filters.Username))
	}
	if len(filters.UserIds) > 0 {
		from += ` AND "id" IN (` + placeholders(len(filters.UserIds)) + `)`
		for _, id := range filters.UserIds {
			args = append(args, id)
		}
	}
	if len(filters.ExcludeUserIds) > 0 {
		from += ` AND "id" NOT IN (` + placeholders(len(filters.ExcludeUserIds)) + `)`
		for _, id := range filters.ExcludeUserIds {
			args = append(args, id)
		}
	}

	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"id", "name", "username"`,
		From:    from,
		OrderBy: `"id"`,
		Args:    args,
		Page:    page,
		PerPage: pickUsersPerPage,
	}, func(rows *sql.Rows) (repository.PickUserRecord, error) {
		var record repository.PickUserRecord
		err := rows.Scan(&record.Id, &record.Name, &record.Username)
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find picker users: %w", err)
	}
	return records, nil
}

func (r *Repository) RemoveNoteShares(ctx context.Context, noteId int64) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		for _, statement := range []string{
			`DELETE FROM "note_share_user" WHERE "note_id" = ?`,
			`DELETE FROM "note_share_link" WHERE "note_id" = ?`,
			`DELETE FROM "note_reminder" WHERE "note_id" = ? AND "user_id" != (SELECT "user_id" FROM "note" WHERE "id" = "note_reminder"."note_id")`,
			`DELETE FROM "notification" WHERE ` + r.dialect.notificationNoteId + ` = ? AND "user_id" != (SELECT "user_id" FROM "note" WHERE "id" = ?)`,
		} {
			args := []any{noteId}
			if strings.Count(statement, "?") == 2 {
				args = append(args, noteId)
			}
			if _, err := tx.q.ExecContext(ctx, statement, args...); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("remove note shares: %w", err)
	}
	return nil
}
