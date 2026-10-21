-- Initial schema. This single migration reflects the latest state of the
-- original NoteMe (Deno) application's database. Column types follow what
-- kysely generated so that existing database files stay compatible.

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
    "is_password_reset_required" boolean
);

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
    "is_deleted" boolean default false not null
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

CREATE TABLE IF NOT EXISTS "file" (
    "id" integer primary key autoincrement,
    "identifier" varchar(255) not null unique,
    "name" varchar(255) not null,
    "user_id" integer not null references "user" ("id"),
    "size" int8 not null,
    "data" blob,
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

CREATE TABLE IF NOT EXISTS "note_tag_note" (
    "id" integer primary key autoincrement,
    "tag_id" integer not null references "note_tag" ("id"),
    "note_id" integer not null references "note" ("id"),
    "created_at" int8 not null
);

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
    "webauthn_user_identifier" text not null,
    "credential_identifier" text not null,
    "public_key" blob not null,
    "counter" int8 not null,
    "is_backed_up" boolean not null,
    "transports" text not null,
    "created_at" int8 not null,
    "last_used_at" int8 not null
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_passkey_user_index"
    ON "user_passkey" ("user_id", "webauthn_user_identifier");
