package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
)

// Like the original, the subgroup and note checks also see deleted children.
const groupColumns = `"id", "name", "parent_id", "created_at",
	(SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id" LIMIT 1),
	(SELECT 1 FROM "group_note" "gn" WHERE "gn"."group_id" = "group"."id" LIMIT 1)`

func (r *Repository) GetGroupById(ctx context.Context, userId int, id int64) (*repository.GroupRecord, error) {
	var record repository.GroupRecord
	err := r.q.QueryRowContext(
		ctx,
		`SELECT `+groupColumns+` FROM "group" WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false`,
		id, userId,
	).Scan(&record.Id, &record.Name, &record.ParentId, &record.CreatedAt, &record.HasSubgroups, &record.HasNotes)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get group: %w", err)
	}

	return &record, nil
}

func (r *Repository) GroupExists(ctx context.Context, userId int, id int64) (bool, error) {
	var exists bool
	err := r.q.QueryRowContext(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM "group" WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false)`,
		id, userId,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check group exists: %w", err)
	}

	return exists, nil
}

func (r *Repository) CreateGroup(ctx context.Context, group repository.NewGroupRecord) (*repository.GroupRecord, error) {
	record := &repository.GroupRecord{Name: group.Name, ParentId: group.ParentId, CreatedAt: now()}

	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if err := tx.requireGroup(ctx, group.UserId, group.ParentId); err != nil {
			return err
		}

		var err error
		record.Id, err = tx.insert(
			ctx,
			`INSERT INTO "group" ("name", "parent_id", "user_id", "created_at") VALUES (?, ?, ?, ?)`,
			group.Name, group.ParentId, group.UserId, record.CreatedAt,
		)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("create group: %w", err)
	}

	return record, nil
}

func (r *Repository) UpdateGroup(ctx context.Context, userId int, id int64, update repository.GroupUpdate) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if err := tx.requireGroup(ctx, userId, &id); err != nil {
			return err
		}

		sets := []string{}
		args := []any{}

		if update.Name != nil {
			sets = append(sets, `"name" = ?`)
			args = append(args, *update.Name)
		}

		if update.SetParent {
			if err := tx.checkNewParent(ctx, userId, id, update.ParentId); err != nil {
				return err
			}
			sets = append(sets, `"parent_id" = ?`)
			args = append(args, update.ParentId)
		}

		if len(sets) == 0 {
			return nil
		}

		_, err := tx.q.ExecContext(
			ctx,
			`UPDATE "group" SET `+strings.Join(sets, ", ")+` WHERE "id" = ? AND "user_id" = ?`,
			append(args, id, userId)...,
		)
		return err
	})
	if err != nil {
		return fmt.Errorf("update group: %w", err)
	}

	return nil
}

func (r *Repository) requireGroup(ctx context.Context, userId int, id *int64) error {
	if id == nil {
		return nil
	}

	exists, err := r.GroupExists(ctx, userId, *id)
	if err != nil {
		return err
	}
	if !exists {
		return repository.ErrGroupNotFound
	}

	return nil
}

func (r *Repository) checkNewParent(ctx context.Context, userId int, id int64, parentId *int64) error {
	if parentId == nil {
		return nil
	}
	if *parentId == id {
		return repository.ErrGroupOwnParent
	}
	if err := r.requireGroup(ctx, userId, parentId); err != nil {
		return err
	}

	// UNION (not UNION ALL) stops the walk if the stored parents ever form a cycle.
	var isDescendant bool
	err := r.q.QueryRowContext(
		ctx,
		`WITH RECURSIVE "ancestor"("id", "parent_id") AS (
			SELECT "id", "parent_id" FROM "group" WHERE "id" = ? AND "user_id" = ?
			UNION
			SELECT "g"."id", "g"."parent_id" FROM "group" "g" INNER JOIN "ancestor" "a" ON "g"."id" = "a"."parent_id"
		)
		SELECT EXISTS (SELECT 1 FROM "ancestor" WHERE "id" = ?)`,
		*parentId, userId, id,
	).Scan(&isDescendant)
	if err != nil {
		return fmt.Errorf("check group ancestors: %w", err)
	}
	if isDescendant {
		return repository.ErrGroupIntoDescendant
	}

	return nil
}

func (r *Repository) DeleteGroup(ctx context.Context, userId int, id int64) error {
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "group" SET "is_deleted" = true WHERE "id" = ? AND "user_id" = ? AND "is_deleted" = false`,
		id, userId,
	)
	if err != nil {
		return fmt.Errorf("delete group: %w", err)
	}

	return nil
}

// Soft-deletes one level below the group: its subgroups and the notes in it.
func (r *Repository) DeleteGroupChildren(ctx context.Context, userId int, parentId int64) (*repository.DeletedGroupChildren, error) {
	deleted := &repository.DeletedGroupChildren{}

	err := r.runInTransaction(ctx, func(tx *Repository) error {
		var err error

		deleted.GroupIds, err = queryIds(ctx, tx.q,
			`SELECT "id" FROM "group" WHERE "parent_id" = ? AND "user_id" = ? AND "is_deleted" = false ORDER BY "id"`,
			parentId, userId,
		)
		if err != nil {
			return err
		}

		deleted.NoteIds, err = queryIds(ctx, tx.q,
			`SELECT "note"."id" FROM "group_note"
			 INNER JOIN "note" ON "note"."id" = "group_note"."note_id"
			 WHERE "group_note"."group_id" = ? AND "note"."user_id" = ? AND "note"."is_deleted" = false
			 ORDER BY "note"."id"`,
			parentId, userId,
		)
		if err != nil {
			return err
		}

		if _, err := tx.q.ExecContext(
			ctx,
			`UPDATE "group" SET "is_deleted" = true WHERE "parent_id" = ? AND "user_id" = ? AND "is_deleted" = false`,
			parentId, userId,
		); err != nil {
			return err
		}

		_, err = tx.q.ExecContext(
			ctx,
			`UPDATE "note" SET "is_deleted" = true, "deleted_at" = ?
			 WHERE "id" IN (SELECT "note_id" FROM "group_note" WHERE "group_id" = ?)
			   AND "user_id" = ? AND "is_deleted" = false`,
			now(), parentId, userId,
		)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("delete group children: %w", err)
	}

	return deleted, nil
}

func queryIds(ctx context.Context, q querier, query string, args ...any) ([]int64, error) {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}
