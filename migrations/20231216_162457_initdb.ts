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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("note").execute();
  await db.schema.dropTable("user").execute();
}
