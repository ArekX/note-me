import {
    deletePasskey,
    findUserPasskeys,
    getPasskeyById,
    getRegisteredUserPasskeys,
    PasskeyByIdRecord,
    passkeyExists,
    PasskeyRegistrationInfo,
    registerPassKey,
    updatePasskey,
    updatePasskeyLastUsedAt,
} from "../query/passkey-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { UserPasskeyRecord } from "../query/passkey-repository.ts";
import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import { PublicKeyCredentialCreationOptionsJSON } from "$backend/deps.ts";
import { UserPasskeyTable } from "$types";
import { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";

type PasskeyRequest<Key extends string, Request, Response> = DbRequest<
    "passkey",
    "repository",
    Key,
    Request,
    Response
>;

type TransferRegistrationInfo =
    & Omit<PasskeyRegistrationInfo, "credentialPublicKey">
    & {
        credentialPublicKey: string;
    };
type RegisterPassKey = PasskeyRequest<"registerPassKey", {
    noteme_user_id: number;
    name: string;
    webauthn_user: PublicKeyCredentialCreationOptionsJSON["user"];
    registration_info: TransferRegistrationInfo;
    transports: string[];
}, void>;

type GetRegisteredUserPasskeys = PasskeyRequest<
    "getRegisteredUserPasskeys",
    number,
    Pick<UserPasskeyTable, "credential_identifier" | "transports">[]
>;

type PasskeyExists = PasskeyRequest<"passkeyExists", string, boolean>;

type PasskeyIdRecordTransfer = Omit<PasskeyByIdRecord, "public_key"> & {
    public_key: string;
};
type GetPasskeyById = PasskeyRequest<
    "getPasskeyById",
    string,
    PasskeyIdRecordTransfer | undefined
>;

type UpdatePasskeyLastUsedAt = PasskeyRequest<
    "updatePasskeyLastUsedAt",
    string,
    void
>;

type UpdatePasskey = PasskeyRequest<"updatePasskey", {
    id: number;
    user_id: number;
    name: string;
}, void>;

type FindUserPasskeys = PasskeyRequest<"findUserPasskeys", {
    user_id: number;
    page: number;
}, Paged<UserPasskeyRecord>>;

type DeletePasskey = PasskeyRequest<"deletePasskey", {
    user_id: number;
    passkey_id: number;
}, void>;

export type PasskeyRepository =
    | RegisterPassKey
    | GetRegisteredUserPasskeys
    | PasskeyExists
    | GetPasskeyById
    | UpdatePasskeyLastUsedAt
    | UpdatePasskey
    | FindUserPasskeys
    | DeletePasskey;

export const passkey: DbHandlerMap<PasskeyRepository> = {
    registerPassKey: ({
        noteme_user_id,
        name,
        webauthn_user,
        registration_info,
        transports,
    }) => {
        return registerPassKey({
            noteme_user_id,
            name,
            webauthn_user,
            registration_info: {
                ...registration_info,
                credentialPublicKey: decodeBase64(
                    registration_info.credentialPublicKey,
                ),
            },
            transports,
        });
    },
    getRegisteredUserPasskeys,
    passkeyExists,
    getPasskeyById: async (passkeyId) => {
        const record = await getPasskeyById(passkeyId);
        if (!record) {
            return undefined;
        }
        return {
            ...record,
            public_key: encodeBase64(record.public_key),
        };
    },
    updatePasskeyLastUsedAt,
    updatePasskey: ({ id, user_id, name }) => updatePasskey(id, user_id, name),
    findUserPasskeys: ({ user_id, page }) => findUserPasskeys(user_id, page),
    deletePasskey: ({ user_id, passkey_id }) =>
        deletePasskey(user_id, passkey_id),
};
