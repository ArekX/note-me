package sqlrepo

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
)

const searchPageSize = 10

func (r *Repository) SearchGeneral(ctx context.Context, userId int, filters repository.SearchFilters) ([]repository.NoteSearchRecord, error) {
	ids, idArgs, err := r.searchNoteIds(ctx, userId, filters, `"note"."user_id" = ? AND "note"."is_deleted" = false`, userId)
	if err != nil {
		return nil, err
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "note"."id", "note"."title", "note"."note", "note"."is_encrypted", "group"."name", "note"."updated_at", "user"."name"
		 FROM "note" `+noteGroupJoin+`
		 INNER JOIN "user" ON "user"."id" = "note"."user_id"
		 WHERE "note"."id" IN (`+ids+`)
		 ORDER BY "note"."id"`,
		append([]any{userId}, idArgs...)...,
	)
	if err != nil {
		return nil, fmt.Errorf("search notes: %w", err)
	}
	defer rows.Close()

	records := []repository.NoteSearchRecord{}
	for rows.Next() {
		var record repository.NoteSearchRecord
		if err := rows.Scan(&record.Id, &record.Title, &record.Note, &record.IsEncrypted, &record.GroupName, &record.UpdatedAt, &record.UserName); err != nil {
			return nil, fmt.Errorf("scan note search result: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read note search results: %w", err)
	}

	return records, nil
}

func (r *Repository) SearchDeletedNotes(ctx context.Context, userId int, filters repository.SearchFilters) ([]repository.DeletedNoteRecord, error) {
	ids, idArgs, err := r.searchNoteIds(ctx, userId, filters, `"note"."user_id" = ? AND "note"."is_deleted" = true`, userId)
	if err != nil {
		return nil, err
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "id", "title", "is_encrypted", "deleted_at" FROM "note" WHERE "id" IN (`+ids+`) ORDER BY "id"`,
		idArgs...,
	)
	if err != nil {
		return nil, fmt.Errorf("search deleted notes: %w", err)
	}
	return scanDeletedNotes(rows)
}

// scope is the search type's own condition; it returns the id subquery that
// selects one page of matching notes.
func (r *Repository) searchNoteIds(ctx context.Context, userId int, filters repository.SearchFilters, scope string, scopeArgs ...any) (string, []any, error) {
	where := []string{scope}
	args := append([]any{userId}, scopeArgs...)

	if filters.Query != "" {
		query := likeContains(filters.Query)
		where = append(where, `(`+r.dialect.likeCondition(`"note"."title"`)+` OR (`+r.dialect.likeCondition(`"note"."note"`)+` AND "note"."is_encrypted" = false))`)
		args = append(args, query, query)
	}

	if filters.GroupId != nil {
		groupIds, err := r.groupWithDescendants(ctx, userId, *filters.GroupId)
		if err != nil {
			return "", nil, err
		}
		where = append(where, `"group_note"."group_id" IN (`+placeholders(len(groupIds))+`)`)
		for _, id := range groupIds {
			args = append(args, id)
		}
	}

	if len(filters.Tags) > 0 {
		where = append(where, `"note"."id" IN (
			SELECT "note_tag_note"."note_id" FROM "note_tag_note"
			INNER JOIN "note_tag" ON "note_tag"."id" = "note_tag_note"."tag_id"
			WHERE "note_tag"."name" IN (`+placeholders(len(filters.Tags))+`))`)
		for _, tag := range filters.Tags {
			args = append(args, tag)
		}
	}

	if filters.FromId != nil {
		where = append(where, `"note"."id" > ?`)
		args = append(args, *filters.FromId)
	}

	// MySQL has no LIMIT in an IN subquery, but takes it in a derived table.
	return `SELECT "id" FROM (SELECT "note"."id" FROM "note"
		LEFT JOIN "group_note" ON "group_note"."note_id" = "note"."id" AND "group_note"."user_id" = ?
		WHERE ` + strings.Join(where, " AND ") + `
		ORDER BY "note"."id"
		LIMIT ` + fmt.Sprint(searchPageSize) + `) "page"`, args, nil
}

// Walks deleted groups too, like the original (0.9.r).
func (r *Repository) groupWithDescendants(ctx context.Context, userId int, groupId int64) ([]int64, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT "id", "parent_id" FROM "group" WHERE "user_id" = ?`, userId)
	if err != nil {
		return nil, fmt.Errorf("find user groups: %w", err)
	}
	defer rows.Close()

	children := map[int64][]int64{}
	for rows.Next() {
		var id int64
		var parentId sql.NullInt64
		if err := rows.Scan(&id, &parentId); err != nil {
			return nil, fmt.Errorf("scan user group: %w", err)
		}
		if parentId.Valid {
			children[parentId.Int64] = append(children[parentId.Int64], id)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read user groups: %w", err)
	}

	ids := []int64{groupId}
	for i := 0; i < len(ids); i++ {
		ids = append(ids, children[ids[i]]...)
	}
	return ids, nil
}
