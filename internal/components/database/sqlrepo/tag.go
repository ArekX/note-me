package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"strings"

	"noteme/internal/components/repository"
)

// Tags are global and matched by name, as in the original.
func normalizeTags(tags []string) []string {
	result := []string{}
	for _, tag := range tags {
		tag = strings.ReplaceAll(strings.TrimSpace(strings.ToLower(tag)), " ", "")
		if tag != "" && !slices.Contains(result, tag) {
			result = append(result, tag)
		}
	}
	return result
}

func (r *Repository) ResolveTags(ctx context.Context, userId int, tags []string) ([]repository.TagRecord, error) {
	names := normalizeTags(tags)
	records := []repository.TagRecord{}
	if len(names) == 0 {
		return records, nil
	}

	args := make([]any, len(names))
	for index, name := range names {
		args[index] = name
	}

	rows, err := r.q.QueryContext(
		ctx,
		`SELECT "id", "name" FROM "note_tag" WHERE "name" IN (`+placeholders(len(names))+`)`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("resolve tags: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var record repository.TagRecord
		if err := rows.Scan(&record.Id, &record.Name); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read tags: %w", err)
	}

	for _, name := range names {
		if slices.ContainsFunc(records, func(record repository.TagRecord) bool { return record.Name == name }) {
			continue
		}
		record, err := r.CreateTagRecord(ctx, userId, name)
		if errors.Is(err, repository.ErrTagExists) {
			record, err = r.tagByName(ctx, name)
		}
		if err != nil {
			return nil, err
		}
		records = append(records, *record)
	}

	return records, nil
}

func (r *Repository) tagByName(ctx context.Context, name string) (*repository.TagRecord, error) {
	var record repository.TagRecord
	err := r.q.QueryRowContext(ctx, `SELECT "id", "name" FROM "note_tag" WHERE "name" = ?`, name).Scan(&record.Id, &record.Name)
	if err != nil {
		return nil, fmt.Errorf("get tag by name: %w", err)
	}
	return &record, nil
}

// An empty list removes every tag of the note (0.9.c).
func (r *Repository) LinkNoteWithTags(ctx context.Context, userId int, noteId int64, tags []string) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		records, err := tx.ResolveTags(ctx, userId, tags)
		if err != nil {
			return err
		}

		linked, err := queryIds(ctx, tx.q, `SELECT "tag_id" FROM "note_tag_note" WHERE "note_id" = ?`, noteId)
		if err != nil {
			return err
		}

		wanted := make([]int64, 0, len(records))
		for _, record := range records {
			wanted = append(wanted, record.Id)
			if slices.Contains(linked, record.Id) {
				continue
			}
			if _, err := tx.insertIfAbsent(ctx,
				`INSERT INTO "note_tag_note" ("note_id", "tag_id", "created_at") VALUES (?, ?, ?)`,
				[]string{"tag_id", "note_id"}, noteId, record.Id, now(),
			); err != nil {
				return err
			}
		}

		for _, tagId := range linked {
			if slices.Contains(wanted, tagId) {
				continue
			}
			if _, err := tx.q.ExecContext(
				ctx,
				`DELETE FROM "note_tag_note" WHERE "note_id" = ? AND "tag_id" = ?`,
				noteId, tagId,
			); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("link note with tags: %w", err)
	}

	return nil
}

func (r *Repository) FindTags(ctx context.Context, name string, page int) (*repository.Paged[repository.TagRecord], error) {
	query := pageQuery{
		Columns: `"id", "name"`,
		From:    `"note_tag"`,
		Page:    page,
	}
	if name != "" {
		query.From += ` WHERE ` + r.dialect.likeCondition(`"name"`)
		query.Args = []any{likeContains(name)}
	}

	records, err := pageResults(ctx, r.q, query, func(rows *sql.Rows) (repository.TagRecord, error) {
		var record repository.TagRecord
		err := rows.Scan(&record.Id, &record.Name)
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find tags: %w", err)
	}

	return records, nil
}

func (r *Repository) CreateTagRecord(ctx context.Context, userId int, name string) (*repository.TagRecord, error) {
	created, err := r.insertIfAbsent(ctx,
		`INSERT INTO "note_tag" ("name", "user_id", "created_at") VALUES (?, ?, ?)`,
		[]string{"name"}, name, userId, now())
	if err != nil {
		return nil, fmt.Errorf("create tag: %w", err)
	}
	if !created {
		return nil, repository.ErrTagExists
	}
	record, err := r.tagByName(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("create tag: %w", err)
	}
	return record, nil
}

func (r *Repository) GetTagRecord(ctx context.Context, id int64) (*repository.TagRecord, error) {
	var record repository.TagRecord
	err := r.q.QueryRowContext(ctx, `SELECT "id", "name" FROM "note_tag" WHERE "id" = ?`, id).Scan(&record.Id, &record.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get tag: %w", err)
	}
	return &record, nil
}

// The name check runs first because a unique violation would end the
// transaction on PostgreSQL.
func (r *Repository) UpdateTagRecord(ctx context.Context, id int64, name string) error {
	var taken bool
	err := r.q.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM "note_tag" WHERE "name" = ? AND "id" != ?)`, name, id).Scan(&taken)
	if err != nil {
		return fmt.Errorf("update tag: %w", err)
	}
	if taken {
		return repository.ErrTagExists
	}
	if _, err := r.q.ExecContext(ctx, `UPDATE "note_tag" SET "name" = ? WHERE "id" = ?`, name, id); err != nil {
		return fmt.Errorf("update tag: %w", err)
	}
	return nil
}

func (r *Repository) DeleteTagRecord(ctx context.Context, id int64) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if _, err := tx.q.ExecContext(ctx, `DELETE FROM "note_tag_note" WHERE "tag_id" = ?`, id); err != nil {
			return err
		}
		_, err := tx.q.ExecContext(ctx, `DELETE FROM "note_tag" WHERE "id" = ?`, id)
		return err
	})
	if err != nil {
		return fmt.Errorf("delete tag: %w", err)
	}
	return nil
}
