-- The whole NoteMe v2 schema in one migration (decision 0.61). Column types
-- follow what kysely generated for the original app so its databases stay
-- compatible; noteme-upgrade brings an original database to this structure
-- and records this migration as applied.

CREATE TABLE IF NOT EXISTS "user" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "username" varchar(60) not null unique,
    "password" varchar(60) not null,
    "timezone" varchar(255),
    "role" varchar(255) not null,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    "is_deleted" boolean default false not null,
    "onboarding_state" text default '{}' not null,
    "encryption_key" text not null,
    "is_password_reset_required" boolean,
    "passkey_user_handle" text,
    "preferred_editor" varchar(255) default 'rich' not null,
    "profile_picture" varchar(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_passkey_user_handle_index"
    ON "user" ("passkey_user_handle");

CREATE TABLE IF NOT EXISTS "note" (
    "id" integer primary key autoincrement,
    "title" varchar(255) not null,
    "note" text not null,
    "is_encrypted" boolean default false not null,
    "user_id" integer not null references "user" ("id"),
    "created_at" int8 not null,
    "updated_at" int8 not null,
    "last_open_at" int8,
    "deleted_at" int8,
    "is_deleted" boolean default false not null,
    "is_wide" boolean default true not null
);

CREATE TABLE IF NOT EXISTS "note_reminder" (
    "id" integer primary key autoincrement,
    "note_id" integer not null references "note" ("id"),
    "user_id" integer not null references "user" ("id"),
    "next_at" int8 not null,
    "interval" int8,
    "unit_value" int8,
    "repeat_count" int8 default 0 not null,
    "done_count" int8 default 0 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "note_reminder_note_user_index"
    ON "note_reminder" ("note_id", "user_id");

CREATE TABLE IF NOT EXISTS "file" (
    "id" integer primary key autoincrement,
    "identifier" varchar(255) not null unique,
    "name" varchar(255) not null,
    "user_id" integer not null references "user" ("id"),
    "size" int8 not null,
    "mime_type" varchar(255) not null,
    "created_at" int8 not null,
    "is_ready" boolean default false not null,
    "is_public" boolean default false not null
);

CREATE TABLE IF NOT EXISTS "note_history" (
    "id" integer primary key autoincrement,
    "note_id" integer not null references "note" ("id"),
    "version" varchar(255) not null,
    "title" varchar(255) not null,
    "tags" text not null,
    "note" text not null,
    "is_encrypted" boolean not null,
    "created_at" int8 not null
);

CREATE TABLE IF NOT EXISTS "note_share_user" (
    "id" integer primary key autoincrement,
    "note_id" integer not null references "note" ("id"),
    "user_id" integer not null references "user" ("id"),
    "created_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "note_share_user_note_user_index"
    ON "note_share_user" ("note_id", "user_id");

CREATE TABLE IF NOT EXISTS "note_share_link" (
    "id" integer primary key autoincrement,
    "identifier" varchar(255) not null unique,
    "note_id" integer not null references "note" ("id"),
    "created_at" int8 not null,
    "expires_at" int8
);

CREATE TABLE IF NOT EXISTS "note_tag" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "user_id" integer not null references "user" ("id"),
    "created_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "note_tag_name_index"
    ON "note_tag" ("name");

CREATE TABLE IF NOT EXISTS "note_tag_note" (
    "id" integer primary key autoincrement,
    "tag_id" integer not null references "note_tag" ("id"),
    "note_id" integer not null references "note" ("id"),
    "created_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "note_tag_note_tag_note_index"
    ON "note_tag_note" ("tag_id", "note_id");

CREATE TABLE IF NOT EXISTS "session" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "key" varchar(255) not null unique,
    "data" text not null,
    "expires_at" int8 not null
);

CREATE TABLE IF NOT EXISTS "notification" (
    "id" integer primary key autoincrement,
    "data" text not null,
    "created_at" int8 not null,
    "is_read" boolean default false not null,
    "is_deleted" boolean default false not null,
    "user_id" integer not null references "user" ("id")
);

CREATE TABLE IF NOT EXISTS "group" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "created_at" int8 not null,
    "user_id" integer not null references "user" ("id"),
    "parent_id" integer references "group" ("id"),
    "is_deleted" boolean default false not null
);

CREATE TABLE IF NOT EXISTS "group_note" (
    "id" integer primary key autoincrement,
    "group_id" integer references "group" ("id"),
    "note_id" integer not null references "note" ("id"),
    "user_id" integer not null references "user" ("id")
);

CREATE TABLE IF NOT EXISTS "periodic_task_schedule" (
    "id" integer primary key autoincrement,
    "task_identifier" varchar(255) not null,
    "next_run_at" int8,
    "is_last_run_successful" boolean,
    "last_successful_run_at" int8,
    "last_fail_reason" text,
    "last_fail_run_at" int8
);

CREATE UNIQUE INDEX IF NOT EXISTS "periodic_task_schedule_task_index"
    ON "periodic_task_schedule" ("task_identifier");

CREATE TABLE IF NOT EXISTS "backup_target" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "type" varchar(255) not null,
    "settings" text not null,
    "last_backup_at" int8,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    -- Column name keeps the original (misspelled) name for compatibility.
    "is_backup_in_progess" boolean default 0 not null
);

CREATE TABLE IF NOT EXISTS "user_passkey" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "user_id" integer not null references "user" ("id"),
    "credential_identifier" text not null,
    "public_key" blob not null,
    "counter" int8 not null,
    "is_backed_up" boolean not null,
    "transports" text not null,
    "created_at" int8 not null,
    "last_used_at" int8 not null,
    "is_backup_eligible" boolean default false not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_passkey_credential_index"
    ON "user_passkey" ("credential_identifier");
CREATE INDEX IF NOT EXISTS "user_passkey_user_id_index"
    ON "user_passkey" ("user_id");

-- user_id has no foreign key: the log outlives the users it mentions.
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" integer primary key autoincrement,
    "created_at" int8 not null,
    "event" varchar(255) not null,
    "user_id" integer,
    "username" varchar(60),
    "address" varchar(255),
    "details" text not null
);

CREATE INDEX IF NOT EXISTS "audit_log_created_at_index"
    ON "audit_log" ("created_at");

CREATE TABLE IF NOT EXISTS "periodic_task_run" (
    "id" integer primary key autoincrement,
    "task_identifier" varchar(255) not null,
    "ran_at" int8 not null,
    "duration_ms" int8 not null,
    "is_successful" boolean not null,
    "fail_reason" text
);

CREATE INDEX IF NOT EXISTS "periodic_task_run_task_ran_at_index"
    ON "periodic_task_run" ("task_identifier", "ran_at");

-- api_key is sealed with AI_ENCRYPTION_KEY (decision 0.83).
CREATE TABLE IF NOT EXISTS "ai_provider" (
    "id" integer primary key autoincrement,
    "name" varchar(255) not null,
    "type" varchar(255) not null,
    "base_url" varchar(2048) not null,
    "api_key" text,
    "model" varchar(255) not null,
    "is_default" boolean default false not null,
    "created_at" int8 not null,
    "updated_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_name_index"
    ON "ai_provider" ("name");

-- No row follows the default provider; a null provider_id means no AI.
CREATE TABLE IF NOT EXISTS "ai_user_access" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "provider_id" integer references "ai_provider" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_access_user_index"
    ON "ai_user_access" ("user_id");

CREATE TABLE IF NOT EXISTS "ai_conversation" (
    "id" integer primary key autoincrement,
    "user_id" integer not null references "user" ("id"),
    "provider_id" integer references "ai_provider" ("id"),
    "provider_name" varchar(255) not null,
    "model" varchar(255) not null,
    "title" varchar(255) not null,
    "created_at" int8 not null,
    "updated_at" int8 not null
);

CREATE INDEX IF NOT EXISTS "ai_conversation_user_updated_index"
    ON "ai_conversation" ("user_id", "updated_at");

CREATE TABLE IF NOT EXISTS "ai_message" (
    "id" integer primary key autoincrement,
    "conversation_id" integer not null references "ai_conversation" ("id"),
    "role" varchar(255) not null,
    "content" text not null,
    "tool_calls" text,
    "tool_call_id" varchar(255),
    "tool_name" varchar(255),
    "tool_status" varchar(255),
    "created_at" int8 not null
);

CREATE INDEX IF NOT EXISTS "ai_message_conversation_index"
    ON "ai_message" ("conversation_id");

-- Secrets and tokens are SHA-256 hashes (decision 0.84).
CREATE TABLE IF NOT EXISTS "mcp_client" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_client_user_name_index"
    ON "mcp_client" ("user_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_client_client_id_index"
    ON "mcp_client" ("client_id");

CREATE TABLE IF NOT EXISTS "mcp_token" (
    "id" integer primary key autoincrement,
    "client_id" integer not null references "mcp_client" ("id"),
    "kind" varchar(255) not null,
    "token_hash" varchar(255) not null,
    "token_prefix" varchar(255) not null,
    "expires_at" int8,
    "rotated_at" int8,
    "created_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_token_hash_index"
    ON "mcp_token" ("token_hash");

CREATE INDEX IF NOT EXISTS "mcp_token_client_index"
    ON "mcp_token" ("client_id");

CREATE INDEX IF NOT EXISTS "mcp_token_expires_at_index"
    ON "mcp_token" ("expires_at");
