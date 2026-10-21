package sqlite

import (
	"context"
	"embed"
	"fmt"

	"noteme/internal/components/database/drivers"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type Migrations struct {
	drivers.Migrations
}

func NewMigrations(db drivers.DB) *Migrations {
	return &Migrations{drivers.Migrations{DB: db, FS: migrationFiles}}
}

// Added to the schema after the first Go builds; the migration that holds
// them is already recorded there, so noteme-upgrade creates them.
var upgradeConstraints = []string{
	"note_reminder_note_user_index", "note_share_user_note_user_index", "note_tag_name_index",
	"note_tag_note_tag_note_index", "periodic_task_schedule_task_index", "audit_log", "audit_log_created_at_index",
	"periodic_task_run", "periodic_task_run_task_ran_at_index", "ai_provider", "ai_provider_name_index",
	"ai_user_access", "ai_user_access_user_index", "ai_conversation", "ai_conversation_user_updated_index", "ai_message",
	"ai_message_conversation_index", "mcp_client", "mcp_client_user_name_index", "mcp_client_client_id_index",
	"mcp_token", "mcp_token_hash_index", "mcp_token_client_index", "mcp_token_expires_at_index",
}

// ExistingValue, when set, is given to the rows already in the table, so it
// can differ from the default new rows get.
type UpgradeColumn struct{ Table, Column, Definition, ExistingValue string }

// Columns added to existing tables after the first Go builds; noteme-upgrade
// adds them with this definition.
var UpgradeColumns = []UpgradeColumn{
	{"note", "is_wide", `boolean default true not null`, `false`},
	{"user", "preferred_editor", `varchar(255) default 'rich' not null`, ``},
	{"user", "profile_picture", `varchar(255)`, ``},
}

// v2 keeps the whole schema in one migration, so these are the leftovers of
// the original app or of earlier builds.
func (m *Migrations) UpgradeReason(ctx context.Context) (string, error) {
	columnChecks := []struct{ table, column, reason string }{
		{"migration", "timestamp", "the migration table is in the original app's format"},
		{"file", "data", "file contents are still stored in the database"},
		{"user_passkey", "webauthn_user_identifier", "passkeys are in the original app's format"},
	}
	for _, check := range columnChecks {
		var found int
		err := m.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?`, check.table, check.column).Scan(&found)
		if err != nil {
			return "", fmt.Errorf("inspect %s: %w", check.table, err)
		}
		if found > 0 {
			return check.reason, nil
		}
	}

	var userTables int
	if err := m.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'user'`).Scan(&userTables); err != nil {
		return "", fmt.Errorf("inspect schema: %w", err)
	}
	if userTables == 0 {
		return "", nil
	}

	for _, column := range UpgradeColumns {
		var found int
		err := m.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?`, column.Table, column.Column).Scan(&found)
		if err != nil {
			return "", fmt.Errorf("inspect %s: %w", column.Table, err)
		}
		if found == 0 {
			return fmt.Sprintf("the %s table has no %s column", column.Table, column.Column), nil
		}
	}

	// A cleared password ('') is left by the upgrade for a skipped user and
	// is reset by an administrator in the app.
	rowChecks := []struct{ query, reason string }{
		{`SELECT COUNT(*) FROM "user" WHERE "password" != '' AND "password" NOT LIKE '$argon2id$%'`, "user passwords are still in the old format"},
		{`SELECT COUNT(*) FROM "user" WHERE "is_deleted" = true`, "deleted users still have data in the database"},
	}
	for _, check := range rowChecks {
		var found int
		if err := m.DB.QueryRowContext(ctx, check.query).Scan(&found); err != nil {
			return "", fmt.Errorf("inspect users: %w", err)
		}
		if found > 0 {
			return check.reason, nil
		}
	}
	for _, name := range upgradeConstraints {
		var found int
		if err := m.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE name = ?`, name).Scan(&found); err != nil {
			return "", fmt.Errorf("inspect schema: %w", err)
		}
		if found == 0 {
			return "the unique indexes, the audit log, the periodic task run table, the AI tables or the MCP tables of the current schema are missing", nil
		}
	}
	return "", nil
}
