import {
    deletePasskey,
    findUserPasskeys,
    getPasskeyById,
    getRegisteredUserPasskeys,
    PasskeyByIdRecord,
    passkeyExists,
    registerPassKey,
    updatePasskey,
    updatePasskeyLastUsedAt,
} from "$backend/repository/passkey-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { UserPasskeyRecord } from "$backend/repository/passkey-repository.ts";
import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    PublicKeyCredentialCreationOptionsJSON,
    VerifiedRegistrationResponse,
} from "$backend/deps.ts";
import { UserPasskeyTable } from "$types";

type PasskeyRequest<Key extends string, Request, Response> = RepositoryRequest<
    "passkey",
    Key,
    Request,
    Response
>;

type RegisterPassKey = PasskeyRequest<"registerPassKey", {
    noteme_user_id: number;
    name: string;
    webauthn_user: PublicKeyCredentialCreationOptionsJSON["user"];
    registration_info: NonNullable<
        VerifiedRegistrationResponse["registrationInfo"]
    >;
    transports: string[];
}, void>;

type GetRegisteredUserPasskeys = PasskeyRequest<
    "getRegisteredUserPasskeys",
    number,
    Pick<UserPasskeyTable, "credential_identifier" | "transports">[]
>;

type PasskeyExists = PasskeyRequest<"passkeyExists", string, boolean>;

type GetPasskeyById = PasskeyRequest<
    "getPasskeyById",
    string,
    PasskeyByIdRecord | undefined
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

export const passkey: RepositoryHandlerMap<PasskeyRepository> = {
    registerPassKey,
    getRegisteredUserPasskeys,
    passkeyExists,
    getPasskeyById,
    updatePasskeyLastUsedAt,
    updatePasskey: ({ id, user_id, name }) => updatePasskey(id, user_id, name),
    findUserPasskeys: ({ user_id, page }) => findUserPasskeys(user_id, page),
    deletePasskey: ({ user_id, passkey_id }) =>
        deletePasskey(user_id, passkey_id),
};
