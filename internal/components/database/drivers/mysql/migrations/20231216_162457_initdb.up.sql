-- The sqlite schema of the same migration with MySQL types; tables and
-- columns must stay the same, backups copy them by name. Every statement ends
-- with ; at the end of a line (the driver runs them one by one). utf8mb4_bin
-- compares text case-sensitively like sqlite; longtext because text holds
-- only 64 KB; foreign keys go at the table level because InnoDB ignores
-- inline references.

CREATE TABLE IF NOT EXISTS "user" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "username" varchar(60) not null unique,
    "password" varchar(255) not null,
    "timezone" varchar(255),
    "role" varchar(255) not null,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    "is_deleted" boolean default false not null,
    "onboarding_state" longtext default ('{}') not null,
    "encryption_key" longtext not null,
    "is_password_reset_required" boolean,
    "passkey_user_handle" varchar(255) character set ascii collate ascii_bin,
    "preferred_editor" varchar(255) default 'rich' not null,
    "profile_picture" varchar(255),
    unique key "user_passkey_user_handle_index" ("passkey_user_handle")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note" (
    "id" bigint auto_increment primary key,
    "title" varchar(255) not null,
    "note" longtext not null,
    "is_encrypted" boolean default false not null,
    "user_id" bigint not null,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    "last_open_at" int8,
    "deleted_at" int8,
    "is_deleted" boolean default false not null,
    "is_wide" boolean default true not null,
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_reminder" (
    "id" bigint auto_increment primary key,
    "note_id" bigint not null,
    "user_id" bigint not null,
    "next_at" int8 not null,
    "interval" int8,
    "unit_value" int8,
    "repeat_count" int8 default 0 not null,
    "done_count" int8 default 0 not null,
    unique key "note_reminder_note_user_index" ("note_id", "user_id"),
    foreign key ("note_id") references "note" ("id"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "file" (
    "id" bigint auto_increment primary key,
    "identifier" varchar(255) not null unique,
    "name" varchar(255) not null,
    "user_id" bigint not null,
    "size" int8 not null,
    "mime_type" varchar(255) not null,
    "created_at" int8 not null,
    "is_ready" boolean default false not null,
    "is_public" boolean default false not null,
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_history" (
    "id" bigint auto_increment primary key,
    "note_id" bigint not null,
    "version" varchar(255) not null,
    "title" varchar(255) not null,
    "tags" longtext not null,
    "note" longtext not null,
    "is_encrypted" boolean not null,
    "created_at" int8 not null,
    foreign key ("note_id") references "note" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_share_user" (
    "id" bigint auto_increment primary key,
    "note_id" bigint not null,
    "user_id" bigint not null,
    "created_at" int8 not null,
    unique key "note_share_user_note_user_index" ("note_id", "user_id"),
    foreign key ("note_id") references "note" ("id"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_share_link" (
    "id" bigint auto_increment primary key,
    "identifier" varchar(255) not null unique,
    "note_id" bigint not null,
    "created_at" int8 not null,
    "expires_at" int8,
    foreign key ("note_id") references "note" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_tag" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "user_id" bigint not null,
    "created_at" int8 not null,
    unique key "note_tag_name_index" ("name"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "note_tag_note" (
    "id" bigint auto_increment primary key,
    "tag_id" bigint not null,
    "note_id" bigint not null,
    "created_at" int8 not null,
    unique key "note_tag_note_tag_note_index" ("tag_id", "note_id"),
    foreign key ("tag_id") references "note_tag" ("id"),
    foreign key ("note_id") references "note" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "session" (
    "id" bigint auto_increment primary key,
    "user_id" bigint not null,
    "key" varchar(255) not null unique,
    "data" longtext not null,
    "expires_at" int8 not null,
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "notification" (
    "id" bigint auto_increment primary key,
    "data" longtext not null,
    "created_at" int8 not null,
    "is_read" boolean default false not null,
    "is_deleted" boolean default false not null,
    "user_id" bigint not null,
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "group" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "created_at" int8 not null,
    "user_id" bigint not null,
    "parent_id" bigint,
    "is_deleted" boolean default false not null,
    foreign key ("user_id") references "user" ("id"),
    foreign key ("parent_id") references "group" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "group_note" (
    "id" bigint auto_increment primary key,
    "group_id" bigint,
    "note_id" bigint not null,
    "user_id" bigint not null,
    foreign key ("group_id") references "group" ("id"),
    foreign key ("note_id") references "note" ("id"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "periodic_task_schedule" (
    "id" bigint auto_increment primary key,
    "task_identifier" varchar(255) not null,
    "next_run_at" int8,
    "is_last_run_successful" boolean,
    "last_successful_run_at" int8,
    "last_fail_reason" longtext,
    "last_fail_run_at" int8,
    unique key "periodic_task_schedule_task_index" ("task_identifier")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "backup_target" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "type" varchar(255) not null,
    "settings" longtext not null,
    "last_backup_at" int8,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    -- Column name keeps the original (misspelled) name for compatibility.
    "is_backup_in_progess" boolean default false not null
) default charset = utf8mb4 collate = utf8mb4_bin;

-- A WebAuthn credential id is at most 1023 bytes, 1364 characters as base64url.
CREATE TABLE IF NOT EXISTS "user_passkey" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "user_id" bigint not null,
    "credential_identifier" varchar(1400) character set ascii collate ascii_bin not null,
    "public_key" longblob not null,
    "counter" int8 not null,
    "is_backed_up" boolean not null,
    "transports" longtext not null,
    "created_at" int8 not null,
    "last_used_at" int8 not null,
    "is_backup_eligible" boolean default false not null,
    unique key "user_passkey_credential_index" ("credential_identifier"),
    key "user_passkey_user_id_index" ("user_id"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" bigint auto_increment primary key,
    "created_at" int8 not null,
    "event" varchar(255) not null,
    "user_id" bigint,
    "username" varchar(60),
    "address" varchar(255),
    "details" longtext not null,
    key "audit_log_created_at_index" ("created_at")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "periodic_task_run" (
    "id" bigint auto_increment primary key,
    "task_identifier" varchar(255) not null,
    "ran_at" int8 not null,
    "duration_ms" int8 not null,
    "is_successful" boolean not null,
    "fail_reason" longtext,
    key "periodic_task_run_task_ran_at_index" ("task_identifier", "ran_at")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "ai_provider" (
    "id" bigint auto_increment primary key,
    "name" varchar(255) not null,
    "type" varchar(255) not null,
    "base_url" varchar(2048) not null,
    "api_key" longtext,
    "model" varchar(255) not null,
    "is_default" boolean default false not null,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    unique key "ai_provider_name_index" ("name")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "ai_user_access" (
    "id" bigint auto_increment primary key,
    "user_id" bigint not null,
    "provider_id" bigint,
    unique key "ai_user_access_user_index" ("user_id"),
    foreign key ("user_id") references "user" ("id"),
    foreign key ("provider_id") references "ai_provider" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "ai_conversation" (
    "id" bigint auto_increment primary key,
    "user_id" bigint not null,
    "provider_id" bigint,
    "provider_name" varchar(255) not null,
    "model" varchar(255) not null,
    "title" varchar(255) not null,
    "created_at" int8 not null,
    "updated_at" int8 not null,
    key "ai_conversation_user_updated_index" ("user_id", "updated_at"),
    foreign key ("user_id") references "user" ("id"),
    foreign key ("provider_id") references "ai_provider" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "ai_message" (
    "id" bigint auto_increment primary key,
    "conversation_id" bigint not null,
    "role" varchar(255) not null,
    "content" longtext not null,
    "tool_calls" longtext,
    "tool_call_id" varchar(255),
    "tool_name" varchar(255),
    "tool_status" varchar(255),
    "created_at" int8 not null,
    key "ai_message_conversation_index" ("conversation_id"),
    foreign key ("conversation_id") references "ai_conversation" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "mcp_client" (
    "id" bigint auto_increment primary key,
    "user_id" bigint not null,
    "name" varchar(255) not null,
    "kind" varchar(255) not null,
    "client_id" varchar(255),
    "client_secret_hash" varchar(255),
    "redirect_uris" longtext not null,
    "is_read_only" boolean default false not null,
    "created_at" int8 not null,
    "last_used_at" int8,
    unique key "mcp_client_user_name_index" ("user_id", "name"),
    unique key "mcp_client_client_id_index" ("client_id"),
    foreign key ("user_id") references "user" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;

CREATE TABLE IF NOT EXISTS "mcp_token" (
    "id" bigint auto_increment primary key,
    "client_id" bigint not null,
    "kind" varchar(255) not null,
    "token_hash" varchar(255) not null,
    "token_prefix" varchar(255) not null,
    "expires_at" int8,
    "rotated_at" int8,
    "created_at" int8 not null,
    unique key "mcp_token_hash_index" ("token_hash"),
    key "mcp_token_client_index" ("client_id"),
    key "mcp_token_expires_at_index" ("expires_at"),
    foreign key ("client_id") references "mcp_client" ("id")
) default charset = utf8mb4 collate = utf8mb4_bin;
