import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { Kysely } from "../lib/migrator/deps.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema.createTable("user")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("name", "varchar(255)", (col) => col.unique().notNull())
        .addColumn("username", "varchar(60)", (col) => col.unique().notNull())
        .addColumn("password", "varchar(60)", (col) => col.notNull())
        .addColumn("timezone", "varchar(255)")
        .addColumn("role", "varchar(255)", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn("updated_at", "int8", (col) => col.notNull())
        .addColumn(
            "is_deleted",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "onboarding_state",
            "text",
            (col) => col.notNull().defaultTo("{}"),
        )
        .addColumn(
            "encryption_key",
            "text",
            (col) => col.notNull(),
        )
        .execute();

    await db.schema.createTable("note")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("title", "varchar(255)", (col) => col.notNull())
        .addColumn("note", "text", (col) => col.notNull())
        .addColumn(
            "is_encrypted",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn("updated_at", "int8", (col) => col.notNull())
        .addColumn("last_open_at", "int8")
        .addColumn("deleted_at", "int8")
        .addColumn(
            "is_deleted",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .execute();

    await db.schema.createTable("note_reminder")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("next_at", "int8", (col) => col.notNull())
        .addColumn("interval", "int8")
        .addColumn("unit_value", "int8")
        .addColumn("repeat_count", "int8", (col) => col.notNull().defaultTo(0))
        .addColumn("done_count", "int8", (col) => col.notNull().defaultTo(0))
        .execute();

    await db.schema.createTable("file")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "identifier",
            "varchar(255)",
            (col) => col.notNull().unique(),
        )
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("size", "int8", (col) => col.notNull())
        .addColumn("data", "blob")
        .addColumn("mime_type", "varchar(255)", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn(
            "is_ready",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "is_public",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .execute();

    await db.schema.createTable("note_history")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn("version", "varchar(255)", (col) => col.notNull())
        .addColumn("title", "varchar(255)", (col) => col.notNull())
        .addColumn("tags", "text", (col) => col.notNull())
        .addColumn("note", "text", (col) => col.notNull())
        .addColumn("is_encrypted", "boolean", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createTable("note_share_user")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("created_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createTable("note_share_link")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "identifier",
            "varchar(255)",
            (col) => col.notNull().unique(),
        )
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn("expires_at", "int8")
        .execute();

    await db.schema.createTable("note_tag")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("created_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createTable("note_tag_note")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "tag_id",
            "integer",
            (col) => col.notNull().references("note_tag.id"),
        )
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn("created_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createTable("session")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("key", "varchar(255)", (col) => col.notNull().unique())
        .addColumn("data", "text", (col) => col.notNull())
        .addColumn("expires_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createTable("notification")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("data", "text", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn(
            "is_read",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "is_deleted",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .execute();

    await db.schema.createTable("group")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("parent_id", "integer", (col) => col.references("group.id"))
        .addColumn(
            "is_deleted",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .execute();

    await db.schema.createTable("group_note")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "group_id",
            "integer",
            (col) => col.references("group.id"),
        )
        .addColumn(
            "note_id",
            "integer",
            (col) => col.notNull().references("note.id"),
        )
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .execute();

    await db.schema.createTable("periodic_task_schedule")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn("task_identifier", "varchar(255)", (col) => col.notNull())
        .addColumn("next_run_at", "int8")
        .addColumn(
            "is_last_run_successful",
            "boolean",
        )
        .addColumn("last_successful_run_at", "int8")
        .addColumn("last_fail_reason", "text")
        .addColumn("last_fail_run_at", "int8")
        .execute();

    await db.schema.createTable("settings")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "is_auto_backup_enabled",
            "boolean",
            (col) => col.notNull().defaultTo(false),
        )
        .addColumn(
            "max_backup_days",
            "int8",
            (col) => col.notNull().defaultTo(5),
        )
        .execute();

    await sql`INSERT INTO settings (is_auto_backup_enabled, max_backup_days) VALUES (0, 5)`
        .execute(
            db,
        );

    await db.schema.createTable("user_passkey")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
        .addColumn(
            "user_id",
            "integer",
            (col) => col.notNull().references("user.id"),
        )
        .addColumn("webauthn_user_identifier", "text", (col) => col.notNull())
        .addColumn("credential_identifier", "text", (col) => col.notNull())
        .addColumn("public_key", "blob", (col) => col.notNull())
        .addColumn("counter", "int8", (col) => col.notNull())
        .addColumn("is_backup_eligible", "boolean", (col) => col.notNull())
        .addColumn("is_backed_up", "boolean", (col) => col.notNull())
        .addColumn("transports", "text", (col) => col.notNull())
        .addColumn("created_at", "int8", (col) => col.notNull())
        .addColumn("last_used_at", "int8", (col) => col.notNull())
        .execute();

    await db.schema.createIndex("user_passkey_user_index")
        .on("user_passkey")
        .columns(["user_id", "webauthn_user_identifier"])
        .unique()
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("note_reminder").execute();
    await db.schema.dropTable("file").execute();
    await db.schema.dropTable("note_history").execute();
    await db.schema.dropTable("note_tag").execute();
    await db.schema.dropTable("note_share_user").execute();
    await db.schema.dropTable("note_share_link").execute();
    await db.schema.dropTable("note_tag_note").execute();
    await db.schema.dropTable("note").execute();
    await db.schema.dropTable("notification").execute();
    await db.schema.dropTable("group").execute();
    await db.schema.dropTable("session").execute();
    await db.schema.dropTable("group_note").execute();
    await db.schema.dropTable("periodic_task_schedule").execute();
    await db.schema.dropTable("user_passkey").execute();
    await db.schema.dropTable("user").execute();
    await db.schema.dropTable("settings").execute();
}
