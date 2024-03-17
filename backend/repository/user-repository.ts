import { db } from "$backend/database.ts";
import { UserTable } from "$types";
import { bcrypt } from "$backend/deps.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";

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
            .where("is_deleted", "=", false)
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
        .where("is_deleted", "=", false)
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
        .where("is_deleted", "=", false)
        .executeTakeFirst();
    return user ?? null;
};

export type CreateUserData = Pick<
    UserTable,
    "name" | "username" | "password" | "role" | "timezone"
>;

export const createUserRecord = async (
    user: CreateUserData,
): Promise<UserId> => {
    const userRecord = {
        name: user.name,
        username: user.username,
        role: user.role,
        timezone: user.timezone,
        password: bcrypt.hashSync(user.password),
        created_at: getCurrentUnixTimestamp(),
        updated_at: getCurrentUnixTimestamp(),
    };
    const result = await db.insertInto("user")
        .values(userRecord)
        .executeTakeFirst();

    if (!result) {
        throw new Error("Could not create user!");
    }

    return {
        id: Number(result.insertId),
        ...userRecord,
    };
};

export type UpdateUserData =
    & Pick<
        UserTable,
        "name" | "role" | "timezone"
    >
    & { new_password?: string | null };

export const updateUserRecord = async (
    user_id: number,
    user: UpdateUserData,
): Promise<boolean> => {
    const userRecord: Partial<
        Pick<
            UserTable,
            "name" | "password" | "role" | "timezone" | "updated_at"
        >
    > = {
        name: user.name,
        role: user.role,
        timezone: user.timezone,
        updated_at: getCurrentUnixTimestamp(),
    };

    if (user.new_password) {
        userRecord.password = bcrypt.hashSync(user.new_password);
    }

    const result = await db.updateTable("user")
        .set(userRecord)
        .where("id", "=", user_id)
        .executeTakeFirst();

    if (!result) {
        throw new Error("Could not create user!");
    }

    return result.numUpdatedRows > 0;
};

export interface FindUserFilters {
    name?: string;
    username?: string;
    role?: Roles | "";
}

export const findUsers = async (
    filters: FindUserFilters,
    page: number,
): Promise<Paged<UserRecord>> => {
    let query = db.selectFrom("user")
        .select([
            "id",
            "name",
            "username",
            "timezone",
            "role",
        ])
        .where("is_deleted", "=", false);

    query = applyFilters(query, {
        name: { type: "text", value: filters.name },
        username: { type: "text", value: filters.username },
        role: { value: filters.role },
    });

    return await pageResults(query, page);
};

export interface UserProfileData extends Pick<UserTable, "name" | "timezone"> {
    new_password?: string;
    old_password?: string;
}

export const updateUserProfile = async (
    profile_user_id: number,
    data: UserProfileData,
): Promise<boolean> => {
    const toUpdate: Partial<
        Pick<UserTable, "name" | "timezone" | "updated_at" | "password">
    > = {
        name: data.name,
        timezone: data.timezone,
        updated_at: getCurrentUnixTimestamp(),
    };

    if (data.old_password && data.new_password) {
        if (!await validateUserPassword(profile_user_id, data.old_password)) {
            throw new Error("Old password is incorrect");
        }

        toUpdate.password = bcrypt.hashSync(data.new_password);
    }

    const result = await db.updateTable("user")
        .set(toUpdate)
        .where("id", "=", profile_user_id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const validateUserPassword = async (
    user_id: number,
    password: string,
) => {
    const user = await db.selectFrom("user")
        .select(["password"])
        .where("id", "=", user_id)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    if (!user) {
        return false;
    }

    return bcrypt.compareSync(password, user.password);
};

export const deleteUserRecord = async (
    id: number,
): Promise<boolean> => {
    const result = await db.updateTable("user")
        .set({
            is_deleted: true,
            updated_at: getCurrentUnixTimestamp(),
        })
        .where("id", "=", id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};
