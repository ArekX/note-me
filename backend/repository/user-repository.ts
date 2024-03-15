import { db } from "$backend/database.ts";
import { UserTable } from "$types";
import { bcrypt } from "$backend/deps.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";

type UserId = { id: number };

export type UserRecord =
  & Pick<
    UserTable,
    "name" | "username" | "password" | "timezone" | "role"
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
      "timezone",
      "role",
    ])
    .where("username", "=", username)
    .executeTakeFirst();

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  return user ?? null;
};

export const getUserById = async (
  id: number,
): Promise<UserRecord | null> => {
  const user = await db.selectFrom("user")
    .select([
      "id",
      "name",
      "username",
      "password",
      "timezone",
      "role",
    ])
    .where("id", "=", id)
    .executeTakeFirst();
  return user ?? null;
};

export const createUserRecord = async (user: {
  name: string;
  username: string;
  password: string;
  role: Roles;
  timezone: string;
}): Promise<UserId> => {
  const userRecord = {
    ...user,
    password: bcrypt.hashSync(user.password),
    created_at: getCurrentUnixTimestamp(),
    updated_at: getCurrentUnixTimestamp(),
    default_group_id: 0,
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

export interface FindUserFilters {
  name?: string;
  username?: string;
  role?: Roles;
}

interface AdminUserRecord extends UserRecord {
  default_group_name: string;
}

export const findUsers = async (
  filters: FindUserFilters,
): Promise<AdminUserRecord[]> => {
  let query = db.selectFrom("user")
    .select([
      "id",
      "name",
      "username",
      "timezone",
      "role",
    ]);

  query = applyFilters(query, {
    name: { type: "text", value: filters.name },
    username: { type: "text", value: filters.username },
    role: { value: filters.role },
  });

  return await query.execute() as AdminUserRecord[];
};

export interface UserProfile extends Pick<UserTable, "name" | "timezone"> {
  new_password?: string;
}

export const updateUserProfile = async (
  profile_user_id: number,
  data: UserProfile,
): Promise<boolean> => {
  const toUpdate: Partial<UserTable> = {
    name: data.name,
    timezone: data.timezone,
    updated_at: getCurrentUnixTimestamp(),
  };

  if (data.new_password) {
    toUpdate.password = bcrypt.hashSync(data.new_password);
  }

  const result = await db.updateTable("user")
    .set(data)
    .where("id", "=", profile_user_id)
    .executeTakeFirst();

  return result.numUpdatedRows > 0;
};
