package backups

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
)

// Every table, parents before the tables that reference them. The migration
// table is left out: each database keeps its own. Session rows are cleared
// but never copied (SF-11).
var snapshotTables = []string{
	"user", "note", "group", "group_note", "note_reminder", "file", "note_history",
	"note_share_user", "note_share_link", "note_tag", "note_tag_note", "session",
	"notification", "periodic_task_schedule", "backup_target", "user_passkey",
	"audit_log", "periodic_task_run", "ai_provider", "ai_user_access",
	"ai_conversation", "ai_message", "mcp_client", "mcp_token",
}

const sessionTable = "session"

// Columns that point at their own table are filled in after every row is
// in, so a group can reference a parent with a higher id.
var selfReferences = map[string]string{"group": "parent_id"}

type querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type snapshotColumn struct {
	name string
	// "bool", "blob" or empty, from the sqlite declared type.
	kind string
}

// PostgreSQL and MySQL have no VACUUM INTO, so their backups copy every row
// into a new sqlite database with the current schema; a backup then looks
// the same whatever database made it.
func exportSnapshot(ctx context.Context, db drivers.DB, path string) error {
	snapshot, err := sqlite.Open(ctx, path)
	if err != nil {
		return err
	}
	defer snapshot.Close()
	if _, err := migrate.New(sqlite.NewMigrations(snapshot)).Up(ctx); err != nil {
		return fmt.Errorf("create snapshot schema: %w", err)
	}
	columns, err := readSnapshotColumns(ctx, snapshot)
	if err != nil {
		return err
	}

	source, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return err
	}
	defer source.Rollback()

	return inTransaction(ctx, snapshot, func(target drivers.Tx) error {
		return copyTables(ctx, source, target, columns)
	})
}

// Replaces every row of db with the rows of the sqlite snapshot at path.
// db must be migrated; the snapshot is migrated here, as it can come from an
// older version.
func importSnapshot(ctx context.Context, path string, db drivers.DB, databaseType string) error {
	snapshot, err := sqlite.Open(ctx, path)
	if err != nil {
		return err
	}
	defer snapshot.Close()
	migrator := migrate.New(sqlite.NewMigrations(snapshot))
	reason, err := migrator.UpgradeReason(ctx)
	if err != nil {
		return err
	}
	if reason != "" {
		return fmt.Errorf("the backup needs noteme-upgrade (%s): restore it into a sqlite database, upgrade it and back it up again", reason)
	}
	if _, err := migrator.Up(ctx); err != nil {
		return fmt.Errorf("migrate backup database: %w", err)
	}
	columns, err := currentSchemaColumns(ctx)
	if err != nil {
		return err
	}
	if err := verifySnapshotColumns(ctx, snapshot, columns); err != nil {
		return err
	}

	return inTransaction(ctx, db, func(target drivers.Tx) error {
		for _, table := range slices.Backward(snapshotTables) {
			if column, ok := selfReferences[table]; ok {
				if _, err := target.ExecContext(ctx, `UPDATE "`+table+`" SET "`+column+`" = NULL`); err != nil {
					return fmt.Errorf("clear %s: %w", table, err)
				}
			}
			if _, err := target.ExecContext(ctx, `DELETE FROM "`+table+`"`); err != nil {
				return fmt.Errorf("clear %s: %w", table, err)
			}
		}
		if err := copyTables(ctx, snapshot, target, columns); err != nil {
			return err
		}
		if databaseType != "postgres" {
			return nil
		}
		// Identity columns do not follow explicitly inserted ids.
		for _, table := range snapshotTables {
			_, err := target.ExecContext(ctx,
				`SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE(MAX("id"), 0) + 1, false) FROM "`+table+`"`,
				`"`+table+`"`)
			if err != nil {
				return fmt.Errorf("reset %s id sequence: %w", table, err)
			}
		}
		return nil
	})
}

// The column list a restore inserts comes from this build's schema, never
// from the archive. A temp file instead of :memory:, which sqlite.Open
// shares between every in-memory connection of the process.
func currentSchemaColumns(ctx context.Context) (map[string][]snapshotColumn, error) {
	temp, err := os.CreateTemp("", "noteme-schema-*.sqlite")
	if err != nil {
		return nil, err
	}
	temp.Close()
	defer removeSqliteFiles(temp.Name())
	db, err := sqlite.Open(ctx, temp.Name())
	if err != nil {
		return nil, err
	}
	defer db.Close()
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		return nil, fmt.Errorf("create schema: %w", err)
	}
	return readSnapshotColumns(ctx, db)
}

func verifySnapshotColumns(ctx context.Context, snapshot drivers.DB, columns map[string][]snapshotColumn) error {
	found, err := readSnapshotColumns(ctx, snapshot)
	if err != nil {
		return err
	}
	for _, table := range snapshotTables {
		for _, column := range columns[table] {
			if !slices.ContainsFunc(found[table], func(c snapshotColumn) bool { return c.name == column.name }) {
				return fmt.Errorf("backup database table %s has no column %s", table, column.name)
			}
		}
	}
	return nil
}

func readSnapshotColumns(ctx context.Context, snapshot drivers.DB) (map[string][]snapshotColumn, error) {
	columns := map[string][]snapshotColumn{}
	for _, table := range snapshotTables {
		rows, err := snapshot.QueryContext(ctx, `SELECT "name", lower("type") FROM pragma_table_info(?) ORDER BY "cid"`, table)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var column snapshotColumn
			var declared string
			if err := rows.Scan(&column.name, &declared); err != nil {
				rows.Close()
				return nil, err
			}
			switch {
			case strings.Contains(declared, "bool"):
				column.kind = "bool"
			case strings.Contains(declared, "blob"):
				column.kind = "blob"
			}
			columns[table] = append(columns[table], column)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if len(columns[table]) == 0 {
			return nil, fmt.Errorf("backup database has no table %s", table)
		}
	}
	return columns, nil
}

func copyTables(ctx context.Context, from, to querier, columns map[string][]snapshotColumn) error {
	for _, table := range snapshotTables {
		if table == sessionTable {
			continue
		}
		if err := copyTable(ctx, from, to, table, columns[table]); err != nil {
			return fmt.Errorf("copy %s: %w", table, err)
		}
	}
	return nil
}

func copyTable(ctx context.Context, from, to querier, table string, columns []snapshotColumn) error {
	names := make([]string, len(columns))
	idIndex, deferredIndex := -1, -1
	for i, column := range columns {
		names[i] = `"` + column.name + `"`
		switch column.name {
		case "id":
			idIndex = i
		case selfReferences[table]:
			deferredIndex = i
		}
	}
	list := strings.Join(names, ", ")
	insert := `INSERT INTO "` + table + `" (` + list + `) VALUES (` + strings.TrimSuffix(strings.Repeat("?, ", len(names)), ", ") + `)`

	rows, err := from.QueryContext(ctx, `SELECT `+list+` FROM "`+table+`" ORDER BY "id"`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var deferred [][2]any
	values := make([]any, len(columns))
	targets := make([]any, len(columns))
	for i := range values {
		targets[i] = &values[i]
	}
	for rows.Next() {
		if err := rows.Scan(targets...); err != nil {
			return err
		}
		for i, column := range columns {
			values[i] = convertValue(values[i], column.kind)
		}
		if deferredIndex >= 0 && values[deferredIndex] != nil {
			deferred = append(deferred, [2]any{values[deferredIndex], values[idIndex]})
			values[deferredIndex] = nil
		}
		if _, err := to.ExecContext(ctx, insert, values...); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, update := range deferred {
		query := `UPDATE "` + table + `" SET "` + selfReferences[table] + `" = ? WHERE "id" = ?`
		if _, err := to.ExecContext(ctx, query, update[0], update[1]); err != nil {
			return err
		}
	}
	return nil
}

// MySQL returns text as []byte, which sqlite would store as a blob;
// PostgreSQL wants real booleans where sqlite and MySQL keep 0 and 1.
func convertValue(value any, kind string) any {
	if bytes, ok := value.([]byte); ok && kind != "blob" {
		value = string(bytes)
	}
	switch kind {
	case "bool":
		switch v := value.(type) {
		case int64:
			return v != 0
		case string:
			parsed, err := strconv.ParseBool(v)
			if err == nil {
				return parsed
			}
		}
	case "blob":
		if text, ok := value.(string); ok {
			return []byte(text)
		}
	}
	return value
}

func inTransaction(ctx context.Context, db drivers.DB, fn func(tx drivers.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func removeSqliteFiles(path string) {
	for _, suffix := range []string{"", "-wal", "-shm"} {
		os.Remove(path + suffix)
	}
}
