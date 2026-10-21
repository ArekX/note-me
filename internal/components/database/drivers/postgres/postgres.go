package postgres

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"strconv"
	"strings"

	"noteme/internal/components/database/drivers"

	_ "github.com/jackc/pgx/v5/stdlib"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func NewMigrations(db drivers.DB) *drivers.Migrations {
	return &drivers.Migrations{DB: db, FS: migrationFiles}
}

// The repository writes ? placeholders; PostgreSQL wants $1, $2, ...
type database struct {
	*sql.DB
}

type transaction struct {
	*sql.Tx
}

// dsn is the part after postgres:// in DATABASE_DSN.
func Open(ctx context.Context, dsn string) (drivers.DB, error) {
	db, err := sql.Open("pgx", "postgres://"+dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres database: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("connect postgres database: %w", err)
	}

	return &database{db}, nil
}

func (d *database) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return d.DB.ExecContext(ctx, rebind(query), args...)
}

func (d *database) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return d.DB.QueryContext(ctx, rebind(query), args...)
}

func (d *database) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return d.DB.QueryRowContext(ctx, rebind(query), args...)
}

func (d *database) BeginTx(ctx context.Context, opts *sql.TxOptions) (drivers.Tx, error) {
	tx, err := d.DB.BeginTx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	return &transaction{tx}, nil
}

func (t *transaction) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return t.Tx.ExecContext(ctx, rebind(query), args...)
}

func (t *transaction) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return t.Tx.QueryContext(ctx, rebind(query), args...)
}

func (t *transaction) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return t.Tx.QueryRowContext(ctx, rebind(query), args...)
}

// Leaves ? inside string literals, quoted identifiers and -- comments alone.
func rebind(query string) string {
	if !strings.Contains(query, "?") {
		return query
	}

	var out strings.Builder
	out.Grow(len(query) + 8)
	var quote byte
	inComment := false
	count := 0
	for i := 0; i < len(query); i++ {
		c := query[i]
		switch {
		case inComment:
			inComment = c != '\n'
		case quote != 0:
			if c == quote {
				quote = 0
			}
		case c == '\'' || c == '"':
			quote = c
		case c == '-' && i+1 < len(query) && query[i+1] == '-':
			inComment = true
		case c == '?':
			count++
			out.WriteByte('$')
			out.WriteString(strconv.Itoa(count))
			continue
		}
		out.WriteByte(c)
	}
	return out.String()
}
