package databasetest

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/mysql"
	"noteme/internal/components/database/drivers/postgres"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
)

// postgres://... or mysql://... (see compose.test.yaml); unset means sqlite.
const EnvDSN = "TEST_DATABASE_DSN"

// A migrated, empty database and its type, closed when the test ends.
func Open(t testing.TB) (drivers.DB, string) {
	t.Helper()
	db, databaseType := OpenEmpty(t)
	if _, err := migrate.New(Migrations(db, databaseType)).Up(context.Background()); err != nil {
		t.Fatal(err)
	}
	return db, databaseType
}

func OpenEmpty(t testing.TB) (drivers.DB, string) {
	t.Helper()
	databaseType, dsn, _ := strings.Cut(DSN(t), "://")
	opener := map[string]func(context.Context, string) (drivers.DB, error){
		"sqlite":   sqlite.Open,
		"postgres": postgres.Open,
		"mysql":    mysql.Open,
	}[databaseType]
	return open(t, opener, dsn), databaseType
}

// A DATABASE_DSN for an empty database of its own: a sqlite file without
// TEST_DATABASE_DSN, otherwise a new postgres schema or mysql database,
// dropped when the test ends.
func DSN(t testing.TB) string {
	t.Helper()
	env := os.Getenv(EnvDSN)
	if env == "" {
		return "sqlite://" + filepath.Join(t.TempDir(), "test.db")
	}

	databaseType, dsn, _ := strings.Cut(env, "://")
	name := "test_" + strings.ToLower(rand.Text())
	switch databaseType {
	case "postgres":
		admin := open(t, postgres.Open, dsn)
		create(t, admin, `CREATE SCHEMA "`+name+`"`, `DROP SCHEMA "`+name+`" CASCADE`)
		separator := "?"
		if strings.Contains(dsn, "?") {
			separator = "&"
		}
		return env + separator + "search_path=" + name
	case "mysql":
		admin := open(t, mysql.Open, dsn)
		create(t, admin, `CREATE DATABASE "`+name+`"`, `DROP DATABASE "`+name+`"`)
		address, err := url.Parse(env)
		if err != nil {
			t.Fatal(err)
		}
		address.Path = "/" + name
		return address.String()
	}

	t.Fatalf("%s: unsupported database type %q", EnvDSN, databaseType)
	return ""
}

func Migrations(db drivers.DB, databaseType string) migrate.Driver {
	switch databaseType {
	case "postgres":
		return postgres.NewMigrations(db)
	case "mysql":
		return mysql.NewMigrations(db)
	}
	return sqlite.NewMigrations(db)
}

func open(t testing.TB, opener func(context.Context, string) (drivers.DB, error), dsn string) drivers.DB {
	t.Helper()
	db, err := opener(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// Cleanups run last in first out, so the drop runs after everything the
// test opened later is closed, and before admin is.
func create(t testing.TB, admin drivers.DB, createQuery, dropQuery string) {
	t.Helper()
	if _, err := admin.ExecContext(context.Background(), createQuery); err != nil {
		t.Fatal(fmt.Errorf("create test database: %w", err))
	}
	t.Cleanup(func() {
		if _, err := admin.ExecContext(context.Background(), dropQuery); err != nil {
			t.Errorf("drop test database: %v", err)
		}
	})
}
