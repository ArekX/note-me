package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"

	"noteme/internal/components/database/drivers"

	_ "modernc.org/sqlite"
)

type database struct {
	*sql.DB
}

const inMemory = ":memory:"

func Open(ctx context.Context, location string) (drivers.DB, error) {
	pragmas := url.Values{"_pragma": {
		"busy_timeout(5000)",
		"foreign_keys(1)",
	}}

	var dsn string

	if location == inMemory {
		dsn = "file::memory:?mode=memory&cache=shared&" + pragmas.Encode()
	} else {
		pragmas.Add("_pragma", "journal_mode(WAL)")
		pragmas.Add("_pragma", "synchronous(NORMAL)")
		dsn = (&url.URL{Scheme: "file", Opaque: location, RawQuery: pragmas.Encode()}).String()
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}

	// SQLite has a single writer; one connection avoids SQLITE_BUSY between pooled connections.
	db.SetMaxOpenConns(1)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("connect sqlite database: %w", err)
	}

	return &database{db}, nil
}

func (d *database) BeginTx(ctx context.Context, opts *sql.TxOptions) (drivers.Tx, error) {
	tx, err := d.DB.BeginTx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	return tx, nil
}
