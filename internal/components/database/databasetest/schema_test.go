package databasetest

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
)

// Every driver's migrations must build the sqlite schema: the same tables,
// columns (kind, nullability, whether there is a default), unique columns,
// foreign keys and named indexes. Backups copy rows between them by name.
func TestSchemaMatchesSqlite(t *testing.T) {
	ctx := context.Background()
	reference, err := sqlite.Open(ctx, filepath.Join(t.TempDir(), "reference.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { reference.Close() })
	if _, err := migrate.New(sqlite.NewMigrations(reference)).Up(ctx); err != nil {
		t.Fatal(err)
	}
	want := readSchema(t, reference, "sqlite")

	db, databaseType := Open(t)
	got := readSchema(t, db, databaseType)

	if !slices.Equal(got.facts, want.facts) {
		for _, fact := range want.facts {
			if !slices.Contains(got.facts, fact) {
				t.Errorf("%s is missing %s", databaseType, fact)
			}
		}
		for _, fact := range got.facts {
			if !slices.Contains(want.facts, fact) {
				t.Errorf("%s has extra %s", databaseType, fact)
			}
		}
	}
	for name, index := range want.indexes {
		if got.indexes[name] != index {
			t.Errorf("%s index %s = %q, want %q", databaseType, name, got.indexes[name], index)
		}
	}
	if len(want.facts) < 100 || len(want.indexes) != 19 {
		t.Fatalf("reference schema looks incomplete: %d facts, %d indexes", len(want.facts), len(want.indexes))
	}
}

type schema struct {
	facts []string
	// Explicitly named indexes; drivers add their own for keys, so only the
	// sqlite names are compared.
	indexes map[string]string
}

var schemaQueries = map[string]struct{ columns, uniques, foreignKeys, indexes string }{
	"sqlite": {
		columns: `SELECT m.name, c.name, c.type, c."notnull" OR c.pk, c.dflt_value IS NOT NULL
			FROM sqlite_master m, pragma_table_info(m.name) c
			WHERE m.type = 'table' AND m.name NOT IN ('sqlite_sequence', 'migration')`,
		uniques: `SELECT m.name, i.name, ii.name
			FROM sqlite_master m, pragma_index_list(m.name) i, pragma_index_info(i.name) ii
			WHERE m.type = 'table' AND m.name != 'migration' AND i."unique" AND i.origin != 'pk'`,
		foreignKeys: `SELECT m.name, f."from", f."table", f."to"
			FROM sqlite_master m, pragma_foreign_key_list(m.name) f WHERE m.type = 'table'`,
		indexes: `SELECT m.name, i.name, i."unique", ii.name
			FROM sqlite_master m, pragma_index_list(m.name) i, pragma_index_info(i.name) ii
			WHERE m.type = 'table' AND i.origin = 'c'`,
	},
	"postgres": {
		columns: `SELECT table_name, column_name, data_type, is_nullable = 'NO', column_default IS NOT NULL
			FROM information_schema.columns
			WHERE table_schema = current_schema() AND table_name != 'migration'`,
		uniques: `SELECT t.relname, i.relname, a.attname
			FROM pg_index x
			JOIN pg_class t ON t.oid = x.indrelid
			JOIN pg_class i ON i.oid = x.indexrelid
			JOIN pg_namespace n ON n.oid = t.relnamespace
			JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(x.indkey)
			WHERE n.nspname = current_schema() AND x.indisunique AND NOT x.indisprimary AND t.relname != 'migration'`,
		foreignKeys: `SELECT t.relname, a.attname, r.relname, ra.attname
			FROM pg_constraint c
			JOIN pg_class t ON t.oid = c.conrelid
			JOIN pg_namespace n ON n.oid = t.relnamespace
			JOIN pg_class r ON r.oid = c.confrelid
			JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
			JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
			WHERE c.contype = 'f' AND n.nspname = current_schema()`,
		indexes: `SELECT t.relname, i.relname, x.indisunique, a.attname
			FROM pg_index x
			JOIN pg_class t ON t.oid = x.indrelid
			JOIN pg_class i ON i.oid = x.indexrelid
			JOIN pg_namespace n ON n.oid = t.relnamespace
			JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(x.indkey)
			WHERE n.nspname = current_schema()`,
	},
	"mysql": {
		columns: `SELECT table_name, column_name, data_type, is_nullable = 'NO', column_default IS NOT NULL
			FROM information_schema.columns
			WHERE table_schema = DATABASE() AND table_name != 'migration'`,
		uniques: `SELECT table_name, index_name, column_name FROM information_schema.statistics
			WHERE table_schema = DATABASE() AND non_unique = 0 AND index_name != 'PRIMARY' AND table_name != 'migration'`,
		foreignKeys: `SELECT table_name, column_name, referenced_table_name, referenced_column_name
			FROM information_schema.key_column_usage
			WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL`,
		indexes: `SELECT table_name, index_name, non_unique = 0, column_name FROM information_schema.statistics
			WHERE table_schema = DATABASE()`,
	},
}

func readSchema(t *testing.T, db drivers.DB, databaseType string) schema {
	t.Helper()
	queries := schemaQueries[databaseType]
	result := schema{indexes: map[string]string{}}

	eachRow(t, db, queries.columns, func(values []string) {
		table, column, kind, notNull, hasDefault := values[0], values[1], columnKind(values[2]), values[3], values[4]
		result.facts = append(result.facts, fmt.Sprintf("column %s.%s %s notnull=%s default=%s", table, column, kind, truth(notNull), truth(hasDefault)))
	})
	eachRow(t, db, queries.uniques, func(values []string) {
		result.facts = append(result.facts, fmt.Sprintf("unique %s(%s)", values[0], values[2]))
	})
	eachRow(t, db, queries.foreignKeys, func(values []string) {
		result.facts = append(result.facts, fmt.Sprintf("foreign key %s.%s -> %s.%s", values[0], values[1], values[2], values[3]))
	})
	eachRow(t, db, queries.indexes, func(values []string) {
		result.indexes[values[1]] = fmt.Sprintf("%s(%s) unique=%s", values[0], values[3], truth(values[2]))
	})

	slices.Sort(result.facts)
	result.facts = slices.Compact(result.facts)
	return result
}

func eachRow(t *testing.T, db drivers.DB, query string, fn func(values []string)) {
	t.Helper()
	rows, err := db.QueryContext(context.Background(), query)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	columns, err := rows.Columns()
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		values := make([]sql.NullString, len(columns))
		targets := make([]any, len(columns))
		for i := range values {
			targets[i] = &values[i]
		}
		if err := rows.Scan(targets...); err != nil {
			t.Fatal(err)
		}
		texts := make([]string, len(values))
		for i, value := range values {
			texts[i] = value.String
		}
		fn(texts)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
}

func columnKind(dataType string) string {
	dataType = strings.ToLower(dataType)
	switch {
	case dataType == "boolean" || dataType == "tinyint":
		return "bool"
	case strings.Contains(dataType, "int"):
		return "int"
	case strings.Contains(dataType, "blob") || dataType == "bytea":
		return "blob"
	case strings.Contains(dataType, "char") || strings.Contains(dataType, "text"):
		return "text"
	}
	return dataType
}

func truth(value string) string {
	switch strings.ToLower(value) {
	case "1", "true", "t":
		return "true"
	}
	return "false"
}
