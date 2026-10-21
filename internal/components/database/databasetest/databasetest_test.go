package databasetest

import (
	"context"
	"testing"

	"noteme/internal/components/database/migrate"
)

func TestMigrationsUpDownUp(t *testing.T) {
	ctx := context.Background()
	db, databaseType := OpenEmpty(t)
	migrator := migrate.New(Migrations(db, databaseType))

	tableExists := func() bool {
		_, err := db.ExecContext(ctx, `SELECT COUNT(*) FROM "user_passkey"`)
		return err == nil
	}

	if _, err := migrator.Up(ctx); err != nil || !tableExists() {
		t.Fatalf("Up() error = %v, tables created = %v", err, tableExists())
	}
	if reason, err := migrator.UpgradeReason(ctx); err != nil || reason != "" {
		t.Fatalf("UpgradeReason() = %q, %v", reason, err)
	}
	all, err := migrator.All()
	if err != nil {
		t.Fatal(err)
	}
	for range all {
		if _, err := migrator.Down(ctx); err != nil {
			t.Fatalf("Down() error = %v", err)
		}
	}
	if tableExists() {
		t.Fatal("tables are left after reverting every migration")
	}
	if first, err := migrator.IsFirstRun(ctx); err != nil || !first {
		t.Fatalf("IsFirstRun() = %v, %v after reverting everything", first, err)
	}
	if _, err := migrator.Up(ctx); err != nil || !tableExists() {
		t.Fatalf("second Up() error = %v", err)
	}
}
