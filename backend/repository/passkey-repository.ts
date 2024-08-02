import {
    PublicKeyCredentialCreationOptionsJSON,
    VerifiedRegistrationResponse,
} from "$backend/deps.ts";
import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { UserPasskeyTable } from "$types";

interface RegisterPassKeyOptions {
    noteme_user_id: number;
    webauthn_user: PublicKeyCredentialCreationOptionsJSON["user"];
    registration_info: NonNullable<
        VerifiedRegistrationResponse["registrationInfo"]
    >;
    transports: string[];
}

export const registerPassKey = async ({
    noteme_user_id,
    webauthn_user,
    registration_info,
    transports,
}: RegisterPassKeyOptions): Promise<void> => {
    await db.insertInto("user_passkey")
        .values({
            user_id: noteme_user_id,
            webauthn_user_identifier: webauthn_user.id,
            credential_identifier: registration_info.credentialID,
            public_key: registration_info.credentialPublicKey,
            counter: registration_info.counter,
            transports: transports.join(","),
            is_backed_up: registration_info.credentialBackedUp,
            is_backup_eligible: registration_info.credentialBackedUp,
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

export const getPasskeyById = async (passkeyId: string) => {
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
