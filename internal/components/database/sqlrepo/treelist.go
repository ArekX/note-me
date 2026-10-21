package sqlrepo

import (
	"context"
	"fmt"

	"noteme/internal/components/repository"
)

// As in the original, a group has children when it has any subgroup, deleted
// ones included, or a note that is not deleted.
const treeGroupQuery = `SELECT 'group' AS "type", "id", "name", 0 AS "is_encrypted",
	COALESCE((
		SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id"
		UNION
		SELECT 1 FROM "group_note" "gn" INNER JOIN "note" "n" ON "n"."id" = "gn"."note_id"
		WHERE "gn"."group_id" = "group"."id" AND "n"."is_deleted" = false
		LIMIT 1
	), 0) AS "has_children"
	FROM "group"
	WHERE "user_id" = ? AND "is_deleted" = false AND "parent_id"`

const treeSubgroupQuery = `SELECT 'group' AS "type", "id", "name", 0 AS "is_encrypted",
	COALESCE((SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id" LIMIT 1), 0) AS "has_children"
	FROM "group"
	WHERE "user_id" = ? AND "is_deleted" = false AND "parent_id"`

const treeNoteQuery = `SELECT 'note' AS "type", "note"."id" AS "id", "note"."title" AS "name",
	CASE WHEN "note"."is_encrypted" THEN 1 ELSE 0 END AS "is_encrypted", 0 AS "has_children"
	FROM "group_note"
	INNER JOIN "note" ON "note"."id" = "group_note"."note_id"
	WHERE "group_note"."user_id" = ? AND "note"."user_id" = ? AND "note"."is_deleted" = false
	  AND "group_note"."group_id"`

// itemType "group" lists only subgroups (has_children then means subgroups),
// "note" only notes and anything else both. groupId nil is the top level.
func (r *Repository) GetTreeList(ctx context.Context, userId int, groupId *int64, itemType string) ([]repository.TreeRecord, error) {
	var query string
	var args []any

	parentIs := ` ` + r.dialect.nullSafeEqual + ` ?`
	switch itemType {
	case repository.TreeItemGroup:
		query = treeSubgroupQuery + parentIs
		args = []any{userId, groupId}
	case repository.TreeItemNote:
		query = treeNoteQuery + parentIs
		args = []any{userId, userId, groupId}
	default:
		query = treeGroupQuery + parentIs + ` UNION ALL ` + treeNoteQuery + parentIs
		args = []any{userId, groupId, userId, userId, groupId}
	}

	rows, err := r.q.QueryContext(ctx, query+` ORDER BY "type", "id"`, args...)
	if err != nil {
		return nil, fmt.Errorf("get tree list: %w", err)
	}
	defer rows.Close()

	records := []repository.TreeRecord{}
	for rows.Next() {
		var record repository.TreeRecord
		if err := rows.Scan(&record.Type, &record.Id, &record.Name, &record.IsEncrypted, &record.HasChildren); err != nil {
			return nil, fmt.Errorf("scan tree list: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read tree list: %w", err)
	}

	return records, nil
}
