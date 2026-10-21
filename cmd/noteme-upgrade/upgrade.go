package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/storage"
)

type kyselyMigration struct {
	name       string
	executedAt int64
}

func upgrade(ctx context.Context, db drivers.DB, filesDir string, in io.Reader, out io.Writer) error {
	migrationColumns, err := columns(ctx, db, "migration")
	if err != nil {
		return err
	}
	if len(migrationColumns) == 0 {
		return fmt.Errorf("no migration table found, this is not a NoteMe database")
	}

	fileColumns, err := columns(ctx, db, "file")
	if err != nil {
		return err
	}

	if fileColumns["data"] {
		if err := extractFiles(ctx, db, filesDir, out); err != nil {
			return err
		}
		if err := dropFileData(ctx, db, out); err != nil {
			return err
		}
	}

	if err := upgradePasskeys(ctx, db, out); err != nil {
		return err
	}

	if migrationColumns["timestamp"] {
		if err := upgradeMigrationTable(ctx, db, out); err != nil {
			return err
		}
	} else {
		fmt.Fprintln(out, "Migration table is already in the new format.")
	}
	if err := removeUnknownMigrations(ctx, db, out); err != nil {
		return err
	}
	if err := upgradeConstraints(ctx, db, out); err != nil {
		return err
	}
	if err := addColumns(ctx, db, out); err != nil {
		return err
	}
	if err := removeDeletedUsers(ctx, db, filesDir, out); err != nil {
		return err
	}

	return upgradeUsers(ctx, db, bufio.NewReader(in), out)
}

func columns(ctx context.Context, db drivers.DB, table string) (map[string]bool, error) {
	rows, err := db.QueryContext(ctx, `SELECT name FROM pragma_table_info(?)`, table)
	if err != nil {
		return nil, fmt.Errorf("read %s columns: %w", table, err)
	}
	defer rows.Close()

	result := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		result[name] = true
	}
	return result, rows.Err()
}

func extractFiles(ctx context.Context, db drivers.DB, filesDir string, out io.Writer) error {
	if err := os.MkdirAll(filesDir, 0o700); err != nil {
		return fmt.Errorf("create files folder: %w", err)
	}

	rows, err := db.QueryContext(ctx, `SELECT identifier, data FROM "file" WHERE data IS NOT NULL ORDER BY id`)
	if err != nil {
		return fmt.Errorf("read files: %w", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var identifier string
		var data []byte
		if err := rows.Scan(&identifier, &data); err != nil {
			return err
		}

		if !storage.ValidName(identifier) {
			return fmt.Errorf("file identifier %q is not a valid file name", identifier)
		}

		if err := writeFile(filepath.Join(filesDir, identifier), data); err != nil {
			return fmt.Errorf("extract file %s: %w", identifier, err)
		}
		count++
	}
	if err := rows.Err(); err != nil {
		return err
	}

	fmt.Fprintf(out, "Extracted %d files.\n", count)
	return nil
}

// The database keeps only file metadata; the bytes live in FILES_LOCATION
// under the identifier. The blob column goes and VACUUM gives the space back.
// Without the column a second run skips extraction.
func dropFileData(ctx context.Context, db drivers.DB, out io.Writer) error {
	if _, err := db.ExecContext(ctx, `ALTER TABLE "file" DROP COLUMN "data"`); err != nil {
		return fmt.Errorf("drop file data column: %w", err)
	}
	if _, err := db.ExecContext(ctx, `VACUUM`); err != nil {
		return fmt.Errorf("vacuum database: %w", err)
	}
	// In WAL mode the compacted database sits in the -wal file until a
	// checkpoint, so the file only shrinks after this.
	if _, err := db.ExecContext(ctx, `PRAGMA wal_checkpoint(TRUNCATE)`); err != nil {
		return fmt.Errorf("checkpoint database: %w", err)
	}
	fmt.Fprintln(out, "Removed file data from the database.")
	return nil
}

// Brings the passkey tables to the v2 structure of the single migration
// (decisions 0.49, 0.61). Passkeys of the original app cannot be verified by
// the new passkey code, so their rows go with the old per-passkey user
// handle. Every step checks first, so a second run changes nothing.
func upgradePasskeys(ctx context.Context, db drivers.DB, out io.Writer) error {
	passkeyColumns, err := columns(ctx, db, "user_passkey")
	if err != nil {
		return err
	}
	userColumns, err := columns(ctx, db, "user")
	if err != nil {
		return err
	}

	var statements []string
	if passkeyColumns["webauthn_user_identifier"] {
		result, err := db.ExecContext(ctx, `DELETE FROM "user_passkey"`)
		if err != nil {
			return fmt.Errorf("remove old passkeys: %w", err)
		}
		if removed, _ := result.RowsAffected(); removed > 0 {
			fmt.Fprintf(out, "Removed %d passkeys of the original app; their users need to register them again.\n", removed)
		}
		statements = append(statements,
			`DROP INDEX IF EXISTS "user_passkey_user_index"`,
			`ALTER TABLE "user_passkey" DROP COLUMN "webauthn_user_identifier"`,
		)
	}
	if !passkeyColumns["is_backup_eligible"] {
		statements = append(statements, `ALTER TABLE "user_passkey" ADD COLUMN "is_backup_eligible" boolean default false not null`)
	}
	if !userColumns["passkey_user_handle"] {
		statements = append(statements, `ALTER TABLE "user" ADD COLUMN "passkey_user_handle" text`)
	}
	if len(statements) == 0 {
		return nil
	}
	statements = append(statements,
		`CREATE UNIQUE INDEX IF NOT EXISTS "user_passkey_credential_index" ON "user_passkey" ("credential_identifier")`,
		`CREATE INDEX IF NOT EXISTS "user_passkey_user_id_index" ON "user_passkey" ("user_id")`,
		`CREATE UNIQUE INDEX IF NOT EXISTS "user_passkey_user_handle_index" ON "user" ("passkey_user_handle")`,
	)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("upgrade passkey tables: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	fmt.Fprintln(out, "Upgraded the passkey tables.")
	return nil
}

// v2 has one migration with the whole schema, so rows of migrations that
// were folded into it (an earlier Go database may have them) are removed.
func removeUnknownMigrations(ctx context.Context, db drivers.DB, out io.Writer) error {
	known, err := migrate.New(sqlite.NewMigrations(db)).All()
	if err != nil {
		return err
	}
	names := make([]any, 0, len(known))
	for _, migration := range known {
		names = append(names, migration.Name)
	}
	result, err := db.ExecContext(ctx,
		`DELETE FROM migration WHERE name NOT IN (`+strings.TrimSuffix(strings.Repeat("?, ", len(names)), ", ")+`)`, names...)
	if err != nil {
		return fmt.Errorf("remove unknown migrations: %w", err)
	}
	if removed, _ := result.RowsAffected(); removed > 0 {
		fmt.Fprintf(out, "Removed %d migration records that are part of the single schema migration now.\n", removed)
	}
	return nil
}

// Written to a temp file first so an interrupted run never leaves a truncated file under the final name.
func writeFile(path string, data []byte) error {
	tmp := path + ".upgrade-tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// kysely keeps migration(name, timestamp ISO string) plus migration_lock; the Go migrator uses migration(name, executed_at unix seconds).
func upgradeMigrationTable(ctx context.Context, db drivers.DB, out io.Writer) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	rows, err := tx.QueryContext(ctx, `SELECT name, timestamp FROM migration ORDER BY name`)
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	var migrations []kyselyMigration
	for rows.Next() {
		var name, timestamp string
		if err := rows.Scan(&name, &timestamp); err != nil {
			rows.Close()
			return err
		}
		executedAt, err := time.Parse(time.RFC3339Nano, timestamp)
		if err != nil {
			rows.Close()
			return fmt.Errorf("parse timestamp of migration %s: %w", name, err)
		}
		migrations = append(migrations, kyselyMigration{name: name, executedAt: executedAt.Unix()})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	statements := []string{
		`DROP TABLE migration`,
		`DROP TABLE IF EXISTS migration_lock`,
		`CREATE TABLE migration (
			"name" varchar(255) primary key not null,
			"executed_at" int8 not null
		)`,
	}
	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("rebuild migration table: %w", err)
		}
	}

	for _, migration := range migrations {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO migration (name, executed_at) VALUES (?, ?)`,
			migration.name, migration.executedAt); err != nil {
			return fmt.Errorf("copy migration %s: %w", migration.name, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	fmt.Fprintf(out, "Converted migration table (%d migrations).\n", len(migrations))
	return nil
}

func addColumns(ctx context.Context, db drivers.DB, out io.Writer) error {
	for _, column := range sqlite.UpgradeColumns {
		existing, err := columns(ctx, db, column.Table)
		if err != nil {
			return err
		}
		if existing[column.Column] {
			continue
		}
		statements := []string{`ALTER TABLE "` + column.Table + `" ADD COLUMN "` + column.Column + `" ` + column.Definition}
		if column.ExistingValue != "" {
			statements = append(statements, `UPDATE "`+column.Table+`" SET "`+column.Column+`" = `+column.ExistingValue)
		}
		if err := inTransaction(ctx, db, statements); err != nil {
			return fmt.Errorf("add %s.%s: %w", column.Table, column.Column, err)
		}
		fmt.Fprintf(out, "Added the %s column to %s.\n", column.Column, column.Table)
	}
	return nil
}

func inTransaction(ctx context.Context, db drivers.DB, statements []string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return tx.Commit()
}
