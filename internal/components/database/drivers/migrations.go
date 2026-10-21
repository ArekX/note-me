package drivers

import (
	"context"
	"fmt"
	"io/fs"
	"strings"
	"time"
)

const trackingTable = "migration"

type Migrations struct {
	DB DB
	FS fs.FS
	// For drivers that run one statement per call (MySQL). Statements in
	// its migration files end with ; at the end of a line, and -- starts a
	// comment anywhere on a line.
	SplitStatements bool
}

func (m *Migrations) Files() fs.FS {
	return m.FS
}

func (m *Migrations) Applied(ctx context.Context) ([]string, error) {
	if err := m.ensureTrackingTable(ctx); err != nil {
		return nil, err
	}

	rows, err := m.DB.QueryContext(ctx, `SELECT name FROM `+trackingTable+` ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list applied migrations: %w", err)
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}

	return names, rows.Err()
}

func (m *Migrations) Apply(ctx context.Context, name, script string) error {
	return m.runInTx(ctx, script, func(tx Tx) error {
		_, err := tx.ExecContext(ctx,
			`INSERT INTO `+trackingTable+` (name, executed_at) VALUES (?, ?)`,
			name, time.Now().Unix())
		return err
	})
}

func (m *Migrations) Revert(ctx context.Context, name, script string) error {
	return m.runInTx(ctx, script, func(tx Tx) error {
		_, err := tx.ExecContext(ctx, `DELETE FROM `+trackingTable+` WHERE name = ?`, name)
		return err
	})
}

func (m *Migrations) UpgradeReason(ctx context.Context) (string, error) {
	return "", nil
}

func (m *Migrations) ensureTrackingTable(ctx context.Context) error {
	_, err := m.DB.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS `+trackingTable+` (
		"name" varchar(255) primary key not null,
		"executed_at" int8 not null
	)`)
	if err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}
	return nil
}

// MySQL commits DDL implicitly, so there a failed migration is not rolled back.
func (m *Migrations) runInTx(ctx context.Context, script string, track func(tx Tx) error) error {
	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	statements := []string{script}
	if m.SplitStatements {
		statements = splitStatements(script)
	}
	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	if err := track(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

func splitStatements(script string) []string {
	var statements []string
	var current strings.Builder
	for line := range strings.Lines(script) {
		trimmed := strings.TrimSpace(line)
		if current.Len() == 0 && (trimmed == "" || strings.HasPrefix(trimmed, "--")) {
			continue
		}
		current.WriteString(line)
		code, _, _ := strings.Cut(trimmed, "--")
		if strings.HasSuffix(strings.TrimSpace(code), ";") {
			statements = append(statements, current.String())
			current.Reset()
		}
	}
	if strings.TrimSpace(current.String()) != "" {
		statements = append(statements, current.String())
	}
	return statements
}
