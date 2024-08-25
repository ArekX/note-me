import { db } from "$backend/database.ts";
import { UserTable } from "$types";
import { bcrypt } from "$backend/deps.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import {
    generateNoteEncryptionKey,
    reEncryptNoteKey,
} from "$backend/encryption.ts";

export type UserId = { id: number };

export interface UserOnboardingState {
    introduction_dismissed?: boolean;
}

export type UserRecord =
    & Pick<
        UserTable,
        | "name"
        | "username"
        | "password"
        | "timezone"
        | "role"
        | "is_password_reset_required"
        | "created_at"
        | "updated_at"
    >
    & UserId;

export interface UserLoginRecord extends UserRecord {
    onboarding_state: UserOnboardingState;
}

const parseOnboardingState = (state: string): UserOnboardingState => {
    try {
        return JSON.parse(state);
    } catch {
        return {};
    }
};

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
): Promise<UserLoginRecord | null> => {
    const record = await db.selectFrom("user")
        .select([
            "id",
            "name",
            "username",
            "password",
            "timezone",
            "role",
            "onboarding_state",
            "is_password_reset_required",
            "created_at",
            "updated_at",
        ])
        .where("username", "=", username)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    if (!record || !bcrypt.compareSync(password, record.password)) {
        return null;
    }

    return record
        ? {
            ...record,
            onboarding_state: parseOnboardingState(
                record.onboarding_state ?? "{}",
            ),
        }
        : null;
};

export const getUserByUsername = async (username: string) => {
    return await db.selectFrom("user")
        .select([
            "id",
            "is_deleted",
        ])
        .where("username", "=", username)
        .executeTakeFirst();
};

export const getUserById = async (
    id: number,
): Promise<UserLoginRecord | null> => {
    const record = await db.selectFrom("user")
        .select([
            "id",
            "name",
            "username",
            "password",
            "timezone",
            "role",
            "onboarding_state",
            "is_password_reset_required",
            "created_at",
            "updated_at",
        ])
        .where("id", "=", id)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    return record
        ? {
            ...record,
            onboarding_state: parseOnboardingState(
                record.onboarding_state ?? "{}",
            ),
        }
        : null;
};

export type CreateUserData = Pick<
    UserTable,
    "name" | "username" | "password" | "role" | "timezone"
>;

export const createUserRecord = async (
    user: CreateUserData,
): Promise<UserId> => {
    const now = getCurrentUnixTimestamp();
    const userRecord = {
        name: user.name,
        username: user.username,
        role: user.role,
        timezone: user.timezone,
        is_password_reset_required: true,
        password: bcrypt.hashSync(user.password),
        encryption_key: await generateNoteEncryptionKey(user.password),
        created_at: now,
        updated_at: now,
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
        "name" | "role" | "timezone" | "is_deleted"
    >
    & { new_password?: string | null };

export const updateUserRecord = async (
    user_id: number,
    user: UpdateUserData,
): Promise<boolean> => {
    const userRecord: Partial<
        Pick<
            UserTable,
            | "name"
            | "password"
            | "role"
            | "timezone"
            | "updated_at"
            | "encryption_key"
            | "is_deleted"
            | "is_password_reset_required"
        >
    > = {
        name: user.name,
        role: user.role,
        timezone: user.timezone,
        is_deleted: user.is_deleted,
        updated_at: getCurrentUnixTimestamp(),
    };

    if (user.new_password) {
        userRecord.password = bcrypt.hashSync(user.new_password);
        userRecord.encryption_key = await generateNoteEncryptionKey(
            user.new_password,
        );
        userRecord.is_password_reset_required = true;
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

    query = applyFilters(query, [
        { field: "name", type: "text", value: filters.name },
        { field: "username", type: "text", value: filters.username },
        { field: "role", type: "value", value: filters.role },
    ]);

    return await pageResults(query, page);
};

export interface FindPickUserFilters {
    name?: string;
    username?: string;
    user_ids?: number[];
    exclude_user_ids?: number[];
}

export interface PickUserRecord {
    id: number;
    name: string;
    username: string;
}

export const findPickerUsers = async (
    filters: FindPickUserFilters,
    page: number,
): Promise<Paged<PickUserRecord>> => {
    let query = db.selectFrom("user")
        .select([
            "id",
            "name",
            "username",
        ])
        .where("is_deleted", "=", false);

    query = applyFilters(query, [
        { field: "name", type: "text", value: filters.name },
        { field: "username", type: "text", value: filters.username },
        { field: "id", type: "value", value: filters.user_ids },
        {
            field: "id",
            type: "value",
            value: filters.exclude_user_ids,
            inverted: true,
        },
    ]);

    return await pageResults(query, page, 5);
};

export interface UserProfileData extends Pick<UserTable, "name" | "timezone"> {
    new_password?: string;
    old_password?: string;
}

export const updateUserProfile = async (
    profile_user_id: number,
    data: Partial<UserProfileData>,
): Promise<boolean> => {
    const toUpdate: Partial<
        Pick<
            UserTable,
            | "name"
            | "timezone"
            | "updated_at"
            | "password"
            | "encryption_key"
            | "is_password_reset_required"
        >
    > = {
        updated_at: getCurrentUnixTimestamp(),
    };

    if (data.name) {
        toUpdate.name = data.name;
    }

    if (data.timezone) {
        toUpdate.timezone = data.timezone;
    }

    if (data.old_password && data.new_password) {
        if (!await validateUserPassword(profile_user_id, data.old_password)) {
            throw new Error("Old password is incorrect");
        }

        toUpdate.password = bcrypt.hashSync(data.new_password);

        const noteEnvryptionKey =
            (await getNoteEncryptionKey(profile_user_id))!;

        toUpdate.encryption_key = await reEncryptNoteKey(
            data.old_password,
            data.new_password,
            noteEnvryptionKey,
        );

        toUpdate.is_password_reset_required = false;
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

export const updateOnboardingState = async (
    user_id: number,
    state: UserOnboardingState,
): Promise<boolean> => {
    const result = await db.updateTable("user")
        .set({
            onboarding_state: JSON.stringify(state),
            updated_at: getCurrentUnixTimestamp(),
        })
        .where("id", "=", user_id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const getNoteEncryptionKey = async (
    user_id: number,
): Promise<string | null> => {
    const result = await db.selectFrom("user")
        .select(["encryption_key"])
        .where("id", "=", user_id)
        .executeTakeFirst();

    return result?.encryption_key ?? null;
};
