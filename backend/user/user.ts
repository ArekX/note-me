import { bcrypt } from "$vendor";
import { db } from "$backend/database.ts";

export type User = {
  userId: number;
  name: string;
  username: string;
};

export const getUser = async (
  username: string,
  password: string,
): Promise<User | null> => {
  const user = await db.selectFrom("user")
    .select(["id", "name", "username", "password"])
    .where("username", "=", username)
    .executeTakeFirst();

  if (!user) {
    return null;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    username: user.username,
  };
};

export const createUser = async (
  name: string,
  username: string,
  password: string,
): Promise<User> => {
  const result = await db.insertInto("user")
    .values({
      username,
      password: bcrypt.hashSync(password),
      name,
      created_at: (new Date()).getTime(),
      updated_at: (new Date()).getTime(),
    })
    .executeTakeFirst();

  if (!result) {
    throw new Error("Could not create user!");
  }

  return {
    userId: Number(result.insertId),
    username,
    name,
  };
};
