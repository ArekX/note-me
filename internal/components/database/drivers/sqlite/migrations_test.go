package sqlite

import (
	"context"
	"testing"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/migrate"
)

func openTestDB(t *testing.T) drivers.DB {
	t.Helper()
	db, err := Open(context.Background(), ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func tableNames(t *testing.T, db drivers.DB) map[string]bool {
	t.Helper()
	rows, err := db.QueryContext(context.Background(), `SELECT name FROM sqlite_master WHERE type = 'table'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()

	names := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatal(err)
		}
		names[name] = true
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	return names
}

func TestEmbeddedMigrationsUpAndDown(t *testing.T) {
	ctx := context.Background()
	db := openTestDB(t)
	m := migrate.New(NewMigrations(db))

	first, err := m.IsFirstRun(ctx)
	if err != nil || !first {
		t.Fatalf("IsFirstRun = %v, %v; want true, nil", first, err)
	}

	applied, err := m.Up(ctx)
	if err != nil {
		t.Fatalf("Up() error = %v", err)
	}
	all, err := m.All()
	if err != nil {
		t.Fatal(err)
	}
	if len(applied) != len(all) {
		t.Fatalf("applied %v, want all %d embedded migrations", applied, len(all))
	}

	tables := tableNames(t, db)
	for _, want := range []string{
		"user", "note", "note_reminder", "file", "note_history", "note_share_user",
		"note_share_link", "note_tag", "note_tag_note", "session", "notification",
		"group", "group_note", "periodic_task_schedule", "backup_target", "user_passkey",
	} {
		if !tables[want] {
			t.Errorf("table %q missing after migration", want)
		}
	}

	again, err := m.Up(ctx)
	if err != nil || len(again) != 0 {
		t.Fatalf("second Up() = %v, %v; want none", again, err)
	}

	first, _ = m.IsFirstRun(ctx)
	if first {
		t.Error("IsFirstRun should be false after migrating")
	}

	for i := len(applied) - 1; i >= 0; i-- {
		name, err := m.Down(ctx)
		if err != nil {
			t.Fatalf("Down() error = %v", err)
		}
		if name != applied[i] {
			t.Errorf("Down() reverted %q, want %q", name, applied[i])
		}
	}

	tables = tableNames(t, db)
	if tables["note"] || tables["user"] {
		t.Error("tables should be dropped after Down()")
	}

	name, err := m.Down(ctx)
	if err != nil || name != "" {
		t.Errorf("Down() on empty = %q, %v; want \"\", nil", name, err)
	}
}

func TestUpgradeReason(t *testing.T) {
	ctx := context.Background()
	for name, setup := range map[string]string{
		"original migration table": `DROP TABLE migration; CREATE TABLE migration (name varchar(255) primary key, timestamp varchar(255))`,
		"file blobs":               `ALTER TABLE "file" ADD COLUMN "data" blob`,
		"original passkeys":        `ALTER TABLE "user_passkey" ADD COLUMN "webauthn_user_identifier" text`,
		"folded migration":         `INSERT INTO migration (name, executed_at) VALUES ('20261019_123255_passkey_security', 0)`,
	} {
		t.Run(name, func(t *testing.T) {
			db := openTestDB(t)
			m := migrate.New(NewMigrations(db))
			if _, err := m.Up(ctx); err != nil {
				t.Fatal(err)
			}
			if reason, err := m.UpgradeReason(ctx); err != nil || reason != "" {
				t.Fatalf("fresh database: %q, %v", reason, err)
			}
			if _, err := db.ExecContext(ctx, setup); err != nil {
				t.Fatal(err)
			}
			if reason, err := m.UpgradeReason(ctx); err != nil || reason == "" {
				t.Errorf("reason = %q, %v", reason, err)
			}
		})
	}
}
