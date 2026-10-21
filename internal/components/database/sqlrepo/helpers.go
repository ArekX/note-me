package sqlrepo

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"noteme/internal/components/repository"
)

const defaultPerPage = 20

func now() int64 {
	return time.Now().Unix()
}

func likeContains(value string) string {
	return "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value) + "%"
}

func placeholders(count int) string {
	return strings.TrimSuffix(strings.Repeat("?, ", count), ", ")
}

func splitTags(tags sql.NullString) []string {
	result := []string{}
	for tag := range strings.SplitSeq(tags.String, ",") {
		if tag != "" {
			result = append(result, tag)
		}
	}
	return result
}

// Inserts unless a row with the same values in the unique columns exists and
// reports whether it did. On MySQL the duplicate shows up as an error, which
// leaves the transaction usable, unlike PostgreSQL where the insert needs ON
// CONFLICT instead.
func (r *Repository) insertIfAbsent(ctx context.Context, insert string, uniqueColumns []string, args ...any) (bool, error) {
	if r.dialect.onConflictDoNothing != nil {
		result, err := r.q.ExecContext(ctx, r.dialect.onConflictDoNothing(insert, uniqueColumns), args...)
		if err != nil {
			return false, err
		}
		affected, err := result.RowsAffected()
		return affected == 1, err
	}
	_, err := r.q.ExecContext(ctx, insert, args...)
	if r.dialect.isUniqueViolation(err) {
		return false, nil
	}
	return err == nil, err
}

type pageQuery struct {
	Columns string
	From    string
	OrderBy string
	Args    []any
	Page    int
	PerPage int
}

// Pages start at 1; a page past the end answers the first empty one, so the
// offset never overflows and nothing lists a whole table.
func pageResults[T any](ctx context.Context, q querier, query pageQuery, scan func(*sql.Rows) (T, error)) (*repository.Paged[T], error) {
	perPage := query.PerPage
	if perPage == 0 {
		perPage = defaultPerPage
	}

	var total int
	if err := q.QueryRowContext(ctx, `SELECT COUNT(*) FROM `+query.From, query.Args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count page results: %w", err)
	}

	page := max(query.Page, 1)
	lastPage := max((total+perPage-1)/perPage, 1)
	if page > lastPage {
		page = lastPage + 1
	}

	sqlQuery := `SELECT ` + query.Columns + ` FROM ` + query.From
	if query.OrderBy != "" {
		sqlQuery += ` ORDER BY ` + query.OrderBy
	}
	sqlQuery += ` LIMIT ? OFFSET ?`
	args := append(query.Args[:len(query.Args):len(query.Args)], perPage, perPage*(page-1))

	rows, err := q.QueryContext(ctx, sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("query page results: %w", err)
	}
	defer rows.Close()

	results := []T{}
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, fmt.Errorf("scan page result: %w", err)
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read page results: %w", err)
	}

	return &repository.Paged[T]{
		Results: results,
		Total:   total,
		Page:    page,
		PerPage: perPage,
	}, nil
}
