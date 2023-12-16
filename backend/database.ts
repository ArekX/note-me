import {
  Generated,
  Kysely,
  SqliteDialect,
} from "$lib/kysely-sqlite-dialect/mod.ts";

interface Person {
  id: Generated<number>;
  first_name: string;
  last_name: string | null;
}

interface Database {
  person: Person;
}

export const db = new Kysely<Database>({
  dialect: new SqliteDialect("./database.sqlite"),
});
