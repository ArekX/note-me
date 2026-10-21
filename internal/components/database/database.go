package database

import (
	"context"
	"fmt"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/mysql"
	"noteme/internal/components/database/drivers/postgres"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/repository"
	"noteme/internal/config"
)

type Database struct {
	DB         drivers.DB
	Repository repository.Repository
	Migrator   *migrate.Migrator
}

func Open(ctx context.Context, cfg *config.Config) (*Database, error) {
	var open func(context.Context, string) (drivers.DB, error)
	var migrations func(drivers.DB) migrate.Driver

	switch cfg.DatabaseType {
	case "sqlite":
		open = sqlite.Open
		migrations = func(db drivers.DB) migrate.Driver { return sqlite.NewMigrations(db) }
	case "postgres":
		open = postgres.Open
		migrations = func(db drivers.DB) migrate.Driver { return postgres.NewMigrations(db) }
	case "mysql":
		open = mysql.Open
		migrations = func(db drivers.DB) migrate.Driver { return mysql.NewMigrations(db) }
	default:
		return nil, fmt.Errorf("unsupported database type %q", cfg.DatabaseType)
	}

	db, err := open(ctx, cfg.DatabaseDsn)
	if err != nil {
		return nil, err
	}
	return &Database{
		DB:         db,
		Repository: sqlrepo.New(db, cfg.DatabaseType),
		Migrator:   migrate.New(migrations(db)),
	}, nil
}
