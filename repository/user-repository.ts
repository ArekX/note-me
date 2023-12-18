import { db } from "$backend/database.ts";
import { UserTable } from "$types/tables.ts";
import { bcrypt } from "$vendor";

type UserId = { id: number };

export type UserRecord =
  & Pick<UserTable, "name" | "username" | "password">
  & UserId;

export const getUserByLogin = async (
  username: string,
  password: string,
): Promise<UserRecord | null> => {
  const user = await db.selectFrom("user")
    .select(["id", "name", "username", "password"])
    .where("username", "=", username)
    .executeTakeFirst();

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  return user ?? null;
};

export const createUserRecord = async (
  username: string,
  password: string,
  name: string,
): Promise<UserId> => {
  const userRecord = {
    username,
    password: bcrypt.hashSync(password),
    name,
    created_at: (new Date()).getTime(),
    updated_at: (new Date()).getTime(),
  };
  const result = await db.insertInto("user")
    .values(userRecord)
    .executeTakeFirst();

  if (!result) {
    throw new Error("Could not create user!");
  }

  return {
    id: Number(result.insertId),
  };
};
