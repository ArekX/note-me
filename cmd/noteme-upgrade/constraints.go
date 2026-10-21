package main

import (
	"context"
	"fmt"
	"io"
	"strings"

	"noteme/internal/components/database/drivers"
)

// Rows the original app allowed but the unique indexes of the v2 schema do
// not: every link is moved to the tag with the lowest id of its name,
// duplicate reminders keep the newest row, the others the oldest.
var deduplications = []struct{ what, statement string }{
	{"tag links moved to the surviving tag", `UPDATE "note_tag_note" SET "tag_id" = (
		SELECT MIN(t."id") FROM "note_tag" t WHERE t."name" = (SELECT d."name" FROM "note_tag" d WHERE d."id" = "note_tag_note"."tag_id")
	) WHERE "tag_id" NOT IN (SELECT MIN("id") FROM "note_tag" GROUP BY "name")`},
	{"duplicate tag links", `DELETE FROM "note_tag_note" WHERE "id" NOT IN (SELECT MIN("id") FROM "note_tag_note" GROUP BY "tag_id", "note_id")`},
	{"duplicate tags", `DELETE FROM "note_tag" WHERE "id" NOT IN (SELECT MIN("id") FROM "note_tag" GROUP BY "name")`},
	{"duplicate reminders", `DELETE FROM "note_reminder" WHERE "id" NOT IN (SELECT MAX("id") FROM "note_reminder" GROUP BY "note_id", "user_id")`},
	{"duplicate shares", `DELETE FROM "note_share_user" WHERE "id" NOT IN (SELECT MIN("id") FROM "note_share_user" GROUP BY "note_id", "user_id")`},
	{"duplicate task schedules", `DELETE FROM "periodic_task_schedule" WHERE "id" NOT IN (SELECT MIN("id") FROM "periodic_task_schedule" GROUP BY "task_identifier")`},
}

// As in the sqlite migration 20231216_162457_initdb.
var constraintStatements = []string{
	`CREATE UNIQUE INDEX IF NOT EXISTS "note_reminder_note_user_index"
    ON "note_reminder" ("note_id", "user_id")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "note_share_user_note_user_index"
    ON "note_share_user" ("note_id", "user_id")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "note_tag_name_index"
    ON "note_tag" ("name")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "note_tag_note_tag_note_index"
    ON "note_tag_note" ("tag_id", "note_id")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "periodic_task_schedule_task_index"
    ON "periodic_task_schedule" ("task_identifier")`,
	`CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" integer primary key autoincrement,
    "created_at" int8 not null,
    "event" varchar(255) not null,
    "user_id" integer,
    "username" varchar(60),
    "address" varchar(255),
    "details" text not null
)`,
	`CREATE INDEX IF NOT EXISTS "audit_log_created_at_index"
    ON "audit_log" ("created_at")`,
	`CREATE TABLE IF NOT EXISTS "periodic_task_run" (
    "id" integer primary key autoincrement,
    "task_identifier" varchar(255) not null,
    "ran_at" int8 not null,
    "duration_ms" int8 not null,
    "is_successful" boolean not null,
    "fail_reason" text
)`,
	`CREATE INDEX IF NOT EXISTS "periodic_task_run_task_ran_at_index"
    ON "periodic_task_run" ("task_identifier", "ran_at")`,
	`CREATE TABLE IF NOT EXISTS "ai_provider" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "type" varchar(255) not null,
    "base_url" varchar(2048) not null,
    "api_key" text,
    "model" varchar(255) not null,
    "is_default" boolean default false not null,
    "created_at" int8 not null,
    "updated_at" int8 not null
)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_name_index"
    ON "ai_provider" ("name")`,
	`CREATE TABLE IF NOT EXISTS "ai_user_access" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "provider_id" integer references "ai_provider" ("id")
)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_access_user_index"
    ON "ai_user_access" ("user_id")`,
	`CREATE TABLE IF NOT EXISTS "ai_conversation" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "provider_id" integer references "ai_provider" ("id"),
    "provider_name" varchar(255) not null,
    "model" varchar(255) not null,
    "title" varchar(255) not null,
    "created_at" int8 not null,
    "updated_at" int8 not null
)`,
	`CREATE INDEX IF NOT EXISTS "ai_conversation_user_updated_index"
    ON "ai_conversation" ("user_id", "updated_at")`,
	`CREATE TABLE IF NOT EXISTS "ai_message" (
    "id" integer primary key autoincrement,
    "conversation_id" integer not null references "ai_conversation" ("id"),
    "role" varchar(255) not null,
    "content" text not null,
    "tool_calls" text,
    "tool_call_id" varchar(255),
    "tool_name" varchar(255),
    "tool_status" varchar(255),
    "created_at" int8 not null
)`,
	`CREATE INDEX IF NOT EXISTS "ai_message_conversation_index"
    ON "ai_message" ("conversation_id")`,
	`CREATE TABLE IF NOT EXISTS "mcp_client" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "name" varchar(255) not null,
    "kind" varchar(255) not null,
    "client_id" varchar(255),
    "client_secret_hash" varchar(255),
    "redirect_uris" text not null,
    "is_read_only" boolean default false not null,
    "created_at" int8 not null,
    "last_used_at" int8
)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "mcp_client_user_name_index"
    ON "mcp_client" ("user_id", "name")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "mcp_client_client_id_index"
    ON "mcp_client" ("client_id")`,
	`CREATE TABLE IF NOT EXISTS "mcp_token" (
    "id" integer primary key autoincrement,
    "client_id" integer not null references "mcp_client" ("id"),
    "kind" varchar(255) not null,
    "token_hash" varchar(255) not null,
    "token_prefix" varchar(255) not null,
    "expires_at" int8,
    "rotated_at" int8,
    "created_at" int8 not null
)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "mcp_token_hash_index"
    ON "mcp_token" ("token_hash")`,
	`CREATE INDEX IF NOT EXISTS "mcp_token_client_index"
    ON "mcp_token" ("client_id")`,
	`CREATE INDEX IF NOT EXISTS "mcp_token_expires_at_index"
    ON "mcp_token" ("expires_at")`,
}

func upgradeConstraints(ctx context.Context, db drivers.DB, out io.Writer) error {
	missing, err := missingConstraints(ctx, db)
	if err != nil {
		return err
	}
	if len(missing) == 0 {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for _, step := range deduplications {
		result, err := tx.ExecContext(ctx, step.statement)
		if err != nil {
			return fmt.Errorf("remove %s: %w", step.what, err)
		}
		if changed, _ := result.RowsAffected(); changed > 0 {
			fmt.Fprintf(out, "Removed %d %s.\n", changed, step.what)
		}
	}
	for _, statement := range constraintStatements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("add constraints: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	fmt.Fprintf(out, "Added %s.\n", strings.Join(missing, ", "))
	return nil
}

func missingConstraints(ctx context.Context, db drivers.DB) ([]string, error) {
	var missing []string
	for _, name := range constraintNames() {
		var found int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE "name" = ?`, name).Scan(&found); err != nil {
			return nil, fmt.Errorf("inspect schema: %w", err)
		}
		if found == 0 {
			missing = append(missing, name)
		}
	}
	return missing, nil
}

func constraintNames() []string {
	names := make([]string, 0, len(constraintStatements))
	for _, statement := range constraintStatements {
		_, rest, _ := strings.Cut(statement, `IF NOT EXISTS "`)
		name, _, _ := strings.Cut(rest, `"`)
		names = append(names, name)
	}
	return names
}
