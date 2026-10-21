package mysql

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"net"
	"net/url"
	"strings"

	"github.com/go-sql-driver/mysql"

	"noteme/internal/components/database/drivers"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func NewMigrations(db drivers.DB) *drivers.Migrations {
	return &drivers.Migrations{DB: db, FS: migrationFiles, SplitStatements: true}
}

type database struct {
	*sql.DB
}

// dsn is the part after mysql:// in DATABASE_DSN:
// user:password@host[:port]/database[?driver-parameters].
func Open(ctx context.Context, dsn string) (drivers.DB, error) {
	cfg, err := parseDSN(dsn)
	if err != nil {
		return nil, err
	}
	connector, err := mysql.NewConnector(cfg)
	if err != nil {
		return nil, fmt.Errorf("open mysql database: %w", err)
	}
	db := sql.OpenDB(connector)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("connect mysql database: %w", err)
	}

	return &database{db}, nil
}

func parseDSN(dsn string) (*mysql.Config, error) {
	address, err := url.Parse("mysql://" + dsn)
	if err != nil {
		return nil, fmt.Errorf("parse mysql dsn: %w", err)
	}
	database := strings.TrimPrefix(address.Path, "/")
	if database == "" {
		return nil, fmt.Errorf("mysql dsn has no database name")
	}

	cfg, err := mysql.ParseDSN("/" + database + "?" + address.RawQuery)
	if err != nil {
		return nil, fmt.Errorf("parse mysql dsn: %w", err)
	}
	cfg.Net = "tcp"
	cfg.Addr = address.Host
	if address.Port() == "" {
		cfg.Addr = net.JoinHostPort(address.Hostname(), "3306")
	}
	cfg.User = address.User.Username()
	cfg.Passwd, _ = address.User.Password()

	// The queries are written for sqlite and PostgreSQL: ANSI brings "quoted"
	// identifiers, NO_BACKSLASH_ESCAPES keeps ESCAPE '\' valid, and found
	// rows (not changed rows) keeps RowsAffected the same as elsewhere.
	if cfg.Params == nil {
		cfg.Params = map[string]string{}
	}
	cfg.Params["sql_mode"] = "'ANSI,STRICT_ALL_TABLES,NO_BACKSLASH_ESCAPES'"
	cfg.ClientFoundRows = true

	return cfg, nil
}

func (d *database) BeginTx(ctx context.Context, opts *sql.TxOptions) (drivers.Tx, error) {
	tx, err := d.DB.BeginTx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	return tx, nil
}
