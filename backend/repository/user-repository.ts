import { db } from "$backend/database.ts";
import { UserTable } from "$types";
import { bcrypt } from "$backend/deps.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";

type UserId = { id: number };

export type UserRecord =
  & Pick<
    UserTable,
    "name" | "username" | "password" | "default_group_id" | "timezone"
  >
  & UserId;

export const checkIfUserExists = async (username: string): Promise<boolean> => {
  if (
    await db.selectFrom("user")
      .select(["id"])
      .where("username", "=", username)
      .executeTakeFirst()
  ) {
    return true;
  }

  return false;
};

export const getUserByLogin = async (
  username: string,
  password: string,
): Promise<UserRecord | null> => {
  const user = await db.selectFrom("user")
    .select([
      "id",
      "name",
      "username",
      "password",
      "default_group_id",
      "timezone",
    ])
    .where("username", "=", username)
    .executeTakeFirst();

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  return user ?? null;
};

export const createUserRecord = async (user: {
  name: string;
  username: string;
  password: string;
}): Promise<UserId> => {
  const userRecord = {
    ...user,
    password: bcrypt.hashSync(user.password),
    created_at: getCurrentUnixTimestamp(),
    updated_at: getCurrentUnixTimestamp(),
    default_group_id: 0,
    timezone: "UTC",
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