package sqlrepo

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-sql-driver/mysql"
)

// Queries use ? placeholders; the postgres driver rewrites them to $n.
type dialect struct {
	returning     bool
	groupConcat   string
	like          string
	nullSafeEqual string
	// The note id in a notification's data, for removing notifications of a
	// deleted note; NULL when the payload has no numeric id.
	notificationNoteId string
	jsonMerge          string
	// Insert that leaves an existing row alone and reports 0 affected rows
	// for it. Unset where the database cannot tell the two apart (MySQL with
	// found rows), see insertIfAbsent.
	onConflictDoNothing func(insert string, columns []string) string
	upsert              func(insert string, conflictColumns, updateColumns []string) string
	isUniqueViolation   func(err error) bool
}

var dialects = map[string]*dialect{
	"sqlite": {
		returning:           true,
		groupConcat:         `GROUP_CONCAT(%s, ',')`,
		like:                `%s LIKE ? ESCAPE '\'`,
		nullSafeEqual:       `IS NOT DISTINCT FROM`,
		notificationNoteId:  `json_extract("data", '$.payload.id')`,
		jsonMerge:           `json_patch(%s, ?)`,
		onConflictDoNothing: onConflictDoNothing,
		upsert:              onConflictDoUpdate,
	},
	"postgres": {
		returning:           true,
		groupConcat:         `STRING_AGG(%s, ',')`,
		like:                `%s ILIKE ? ESCAPE '\'`,
		nullSafeEqual:       `IS NOT DISTINCT FROM`,
		notificationNoteId:  `CASE WHEN jsonb_typeof("data"::jsonb #> '{payload,id}') = 'number' THEN ("data"::jsonb #>> '{payload,id}')::numeric END`,
		jsonMerge:           `(%s::jsonb || ?::jsonb)::text`,
		onConflictDoNothing: onConflictDoNothing,
		upsert:              onConflictDoUpdate,
	},
	// Tables use a binary collation so that = matches like in sqlite; LIKE
	// lowers both sides to stay case-insensitive.
	"mysql": {
		groupConcat:        `GROUP_CONCAT(%s SEPARATOR ',')`,
		like:               `LOWER(%s) LIKE LOWER(?) ESCAPE '\'`,
		nullSafeEqual:      `<=>`,
		notificationNoteId: `JSON_VALUE("data", '$.payload.id' RETURNING SIGNED)`,
		jsonMerge:          `JSON_MERGE_PATCH(%s, ?)`,
		upsert: func(insert string, _, updateColumns []string) string {
			sets := make([]string, len(updateColumns))
			for i, column := range updateColumns {
				sets[i] = `"` + column + `" = "new"."` + column + `"`
			}
			return insert + ` AS "new" ON DUPLICATE KEY UPDATE ` + strings.Join(sets, ", ")
		},
		isUniqueViolation: func(err error) bool {
			var mysqlErr *mysql.MySQLError
			return errors.As(err, &mysqlErr) && mysqlErr.Number == 1062
		},
	},
}

func quotedList(columns []string) string {
	quoted := make([]string, len(columns))
	for i, column := range columns {
		quoted[i] = `"` + column + `"`
	}
	return strings.Join(quoted, ", ")
}

func onConflictDoNothing(insert string, columns []string) string {
	return insert + ` ON CONFLICT (` + quotedList(columns) + `) DO NOTHING`
}

func onConflictDoUpdate(insert string, conflictColumns, updateColumns []string) string {
	sets := make([]string, len(updateColumns))
	for i, column := range updateColumns {
		sets[i] = `"` + column + `" = excluded."` + column + `"`
	}
	return insert + ` ON CONFLICT (` + quotedList(conflictColumns) + `) DO UPDATE SET ` + strings.Join(sets, ", ")
}

func (d *dialect) likeCondition(column string) string {
	return fmt.Sprintf(d.like, column)
}
