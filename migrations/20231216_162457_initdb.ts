import { Kysely } from "$lib/migrator/deps.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.createTable("user")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.unique().notNull())
    .addColumn("username", "varchar(60)", (col) => col.unique().notNull())
    .addColumn("password", "varchar(60)", (col) => col.notNull())
    .addColumn("created_at", "int8", (col) => col.notNull())
    .addColumn("updated_at", "int8", (col) => col.notNull())
    .execute();

  await db.schema.createTable("note")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("note", "text", (col) => col.notNull())
    .addColumn(
      "user_id",
      "integer",
      (col) => col.notNull().references("user.id"),
    )
    .addColumn("created_at", "int8", (col) => col.notNull())
    .addColumn("updated_at", "int8", (col) => col.notNull())
    .execute();

  await db.schema.createTable("session")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("key", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("data", "text", (col) => col.notNull())
    .addColumn("expires_at", "int8", (col) => col.notNull())
    .execute();

  await db.schema.createTable("notification")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("data", "text", (col) => col.notNull())
    .addColumn("created_at", "int8", (col) => col.notNull())
    .addColumn("is_read", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("is_deleted", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn(
      "user_id",
      "integer",
      (col) => col.notNull().references("user.id"),
    )
    .execute();

  await db.schema.createTable("group")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("created_at", "int8", (col) => col.notNull())
    .addColumn(
      "user_id",
      "integer",
      (col) => col.notNull().references("user.id"),
    )
    .addColumn("parent_id", "integer", (col) => col.references("group.id"))
    .execute();

  await db.schema.createTable("group_note")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn(
      "group_id",
      "integer",
      (col) => col.notNull().references("group.id"),
    )
    .addColumn(
      "note_id",
      "integer",
      (col) => col.notNull().references("note.id"),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("note").execute();
  await db.schema.dropTable("notification").execute();
  await db.schema.dropTable("group").execute();
  await db.schema.dropTable("session").execute();
  await db.schema.dropTable("group_note").execute();
  await db.schema.dropTable("user").execute();
}
