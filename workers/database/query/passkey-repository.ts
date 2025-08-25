import {
    decodeBase64,
    PublicKeyCredentialCreationOptionsJSON,
} from "$backend/deps.ts";
import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { RecordId, UserPasskeyTable } from "$types";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

export type PasskeyRegistrationInfo = {
    credentialID: string;
    credentialBackedUp: boolean;
    counter: number;
    credentialPublicKey: string;
};

interface RegisterPassKeyOptions {
    noteme_user_id: number;
    name: string;
    webauthn_user: PublicKeyCredentialCreationOptionsJSON["user"];
    registration_info: PasskeyRegistrationInfo;
    transports: string[];
}

export const registerPassKey = async ({
    noteme_user_id,
    name,
    webauthn_user,
    registration_info,
    transports,
}: RegisterPassKeyOptions): Promise<void> => {
    await db.insertInto("user_passkey")
        .values({
            name,
            user_id: noteme_user_id,
            webauthn_user_identifier: webauthn_user.id,
            credential_identifier: registration_info.credentialID,
            public_key: decodeBase64(registration_info.credentialPublicKey),
            counter: registration_info.counter,
            transports: transports.join(","),
            is_backed_up: registration_info.credentialBackedUp,
            created_at: getCurrentUnixTimestamp(),
            last_used_at: getCurrentUnixTimestamp(),
        })
        .executeTakeFirst();
};

export const getRegisteredUserPasskeys = async (
    user_id: number,
): Promise<
    Pick<UserPasskeyTable, "credential_identifier" | "transports">[]
> => {
    return await db.selectFrom("user_passkey")
        .select([
            "credential_identifier",
            "transports",
        ])
        .where("user_id", "=", user_id)
        .execute();
};

export const passkeyExists = async (passkeyId: string): Promise<boolean> => {
    return (await db.selectFrom("user_passkey")
        .where("credential_identifier", "=", passkeyId)
        .select([
            sql<number>`1`.as("exists"),
        ])
        .executeTakeFirst())?.exists === 1;
};

export type PasskeyByIdRecord = Pick<
    UserPasskeyTable,
    | "credential_identifier"
    | "public_key"
    | "counter"
    | "transports"
    | "user_id"
>;

export const getPasskeyById = async (
    passkeyId: string,
): Promise<PasskeyByIdRecord | undefined> => {
    return await db.selectFrom("user_passkey")
        .where("credential_identifier", "=", passkeyId)
        .select([
            "credential_identifier",
            "public_key",
            "counter",
            "transports",
            "user_id",
        ])
        .executeTakeFirst();
};

export const updatePasskeyLastUsedAt = async (passkeyId: string) => {
    await db.updateTable("user_passkey")
        .set("last_used_at", getCurrentUnixTimestamp())
        .where("credential_identifier", "=", passkeyId)
        .execute();
};

export const updatePasskey = async (
    id: number,
    user_id: number,
    name: string,
) => {
    await db.updateTable("user_passkey")
        .set({
            name,
        })
        .where("id", "=", id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();
};

export type UserPasskeyRecord =
    & Pick<
        UserPasskeyTable,
        "name" | "last_used_at" | "created_at" | "transports"
    >
    & RecordId;

export const findUserPasskeys = async (
    user_id: number,
    page: number,
): Promise<Paged<UserPasskeyRecord>> => {
    const query = db.selectFrom("user_passkey")
        .select([
            "id",
            "name",
            "last_used_at",
            "created_at",
            "transports",
        ])
        .where("user_id", "=", user_id)
        .orderBy("created_at", "desc");

    return await pageResults(query, page);
};

export const deletePasskey = async (user_id: number, passkey_id: number) => {
    await db.deleteFrom("user_passkey")
        .where("id", "=", passkey_id)
        .where("user_id", "=", user_id)
        .execute();
};
