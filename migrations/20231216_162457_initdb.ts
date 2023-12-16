import { Kysely } from "$lib/migrator/deps.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.createTable("users")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("username", "varchar(60)", (col) => col.unique().notNull())
    .addColumn("password", "varchar(60)", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("users").execute();
}
