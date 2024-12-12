import { Message } from "$workers/websocket/types.ts";
import {
    AddUserRequest,
    EditUserProfile,
    UpdateUserRequest,
} from "$schemas/users.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import {
    FindPickUserFilters,
    FindUserFilters,
    PickUserRecord,
    UserId,
    UserOnboardingState,
    UserRecord,
} from "../../../database/query/user-repository.ts";
import {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
} from "$backend/deps.ts";
import { UserPasskeyRecord } from "../../../database/query/passkey-repository.ts";
import { RegistrationResult } from "$backend/passkeys.ts";

type UserMessage<Type, Data = unknown> = Message<
    "users",
    Type,
    Data
>;

export type CreateUserMessage = UserMessage<
    "createUser",
    { data: AddUserRequest }
>;

export type CreateUserResponse = UserMessage<
    "createUserResponse",
    { data: UserId }
>;

export type UpdateUserMessage = UserMessage<
    "updateUser",
    { id: number; data: UpdateUserRequest }
>;

export type UpdateUserResponse = UserMessage<
    "updateUserResponse",
    { updated_id: number; updated_data: UpdateUserRequest }
>;

export type DeleteUserMessage = UserMessage<
    "deleteUser",
    { id: number }
>;

export type DeleteUserResponse = UserMessage<
    "deleteUserResponse",
    { deleted_id: number }
>;

export type FindUsersMessage = UserMessage<
    "findUsers",
    { filters: FindUserFilters; page: number }
>;

export type FindUsersResponse = UserMessage<
    "findUsersResponse",
    {
        records: Paged<UserRecord>;
    }
>;

export type UpdateProfileMessage = UserMessage<
    "updateProfile",
    { data: EditUserProfile }
>;

export type UpdateProfileResponse = UserMessage<
    "updateProfileResponse",
    { data: EditUserProfile }
>;

export type FindPickUsersMessage = UserMessage<
    "findPickUsers",
    { filters: FindPickUserFilters; page: number }
>;

export type FindPickUsersResponse = UserMessage<
    "findPickUsersResponse",
    {
        records: Paged<PickUserRecord>;
    }
>;

export type UpdateOnboardingStateMessage = UserMessage<
    "updateOnboarding",
    { onboarding_state: UserOnboardingState }
>;

export type UpdateOnboardingStateResponse = UserMessage<
    "updateOnboardingResponse",
    { onboarding_state: UserOnboardingState }
>;

export type VerifyOwnPasswordMessage = UserMessage<
    "verifyOwnPassword",
    { password: string }
>;

export type VerifyOwnPasswordResponse = UserMessage<
    "verifyOwnPasswordResponse",
    { verified: boolean }
>;

export type EncryptTextMessage = UserMessage<
    "encryptText",
    { text: string; password: string }
>;

export type EncryptTextResponse = UserMessage<
    "encryptTextResponse",
    { encrypted: string }
>;

export type DecryptTextMessage = UserMessage<
    "decryptText",
    { encrypted: string; password: string }
>;

export type DecryptTextResponse = UserMessage<
    "decryptTextResponse",
    { text: string }
>;

export type ExportOwnDataMessage = UserMessage<
    "exportOwnData",
    { user_password: string }
>;

export type ExportOwnDataResponse = UserMessage<
    "exportOwnDataResponse",
    { export_id: string; job_id: string }
>;

export type ExportOwnDataPercentageUpdate = UserMessage<
    "exportOwnDataPercentage",
    { export_id: string; percentage: number }
>;

export type ExportOwnDataFinished = UserMessage<
    "exportOwnDataFinished",
    { export_id: string }
>;

export type ExportOwnDataFailed = UserMessage<
    "exportOwnDataFailed",
    { export_id: string; message: string }
>;

export type CancelExportOwnDataMessage = UserMessage<
    "cancelExportOwnData",
    { job_id: string }
>;

export type CancelExportOwnDataResponse = UserMessage<
    "cancelExportOwnDataResponse",
    { job_id: string }
>;

export type UserForceLogoutResponse = UserMessage<
    "forceLogoutResponse"
>;

export type GetPasskeyRegistrationMessage = UserMessage<
    "getPasskeyRegistrationOptions"
>;

export type GetPasskeyRegistrationResponse = UserMessage<
    "getPasskeyRegistrationOptionsResponse",
    { options: PublicKeyCredentialCreationOptionsJSON }
>;

export type VerifyPasskeyRegistrationMessage = UserMessage<
    "verifyPasskeyRegistration",
    { response: RegistrationResponseJSON }
>;

export type VerifyPasskeyRegistrationResponse = UserMessage<
    "verifyPasskeyRegistrationResponse",
    RegistrationResult
>;

export type GetOwnPasskeysMessage = UserMessage<
    "getOwnPasskeys",
    { page: number }
>;

export type GetOwnPasskeysResponse = UserMessage<
    "getOwnPasskeysResponse",
    { records: Paged<UserPasskeyRecord> }
>;

export type DeleteOwnPasskeyMessage = UserMessage<
    "deleteOwnPasskey",
    { id: number }
>;

export type DeleteOwnPasskeyResponse = UserMessage<
    "deleteOwnPasskeyResponse",
    { id: number }
>;

export type UpdateOwnPasskeyMessage = UserMessage<
    "updateOwnPasskey",
    { id: number; name: string }
>;

export type UpdateOwnPasskeyResponse = UserMessage<
    "updateOwnPasskeyResponse",
    { id: number; name: string }
>;

export type UserFrontendResponse =
    | CreateUserResponse
    | UpdateUserResponse
    | DeleteUserResponse
    | FindUsersResponse
    | UpdateProfileResponse
    | FindPickUsersResponse
    | UpdateOnboardingStateResponse
    | VerifyOwnPasswordResponse
    | EncryptTextResponse
    | DecryptTextResponse
    | UserForceLogoutResponse
    | ExportOwnDataResponse
    | ExportOwnDataPercentageUpdate
    | ExportOwnDataFinished
    | ExportOwnDataFailed
    | CancelExportOwnDataResponse
    | GetPasskeyRegistrationResponse
    | VerifyPasskeyRegistrationResponse
    | GetOwnPasskeysResponse
    | DeleteOwnPasskeyResponse
    | UpdateOwnPasskeyResponse;

export type UserFrontendMessage =
    | CreateUserMessage
    | UpdateUserMessage
    | DeleteUserMessage
    | FindUsersMessage
    | UpdateProfileMessage
    | FindPickUsersMessage
    | UpdateOnboardingStateMessage
    | VerifyOwnPasswordMessage
    | EncryptTextMessage
    | DecryptTextMessage
    | ExportOwnDataMessage
    | CancelExportOwnDataMessage
    | GetPasskeyRegistrationMessage
    | VerifyPasskeyRegistrationMessage
    | GetOwnPasskeysMessage
    | DeleteOwnPasskeyMessage
    | UpdateOwnPasskeyMessage;

export type NotifyUserExportUpdatedMessage = UserMessage<
    "notifyUserExportUpdated",
    { export_id: string; user_id: number; percentage: number }
>;

export type NotifyUserExportFinishedMessage = UserMessage<
    "notifyUserExportFinished",
    { export_id: string; user_id: number }
>;

export type NotifyUserExportFailedMessage = UserMessage<
    "notifyUserExportFailed",
    { export_id: string; message: string; user_id: number }
>;

export type UserBackendMessage =
    | NotifyUserExportUpdatedMessage
    | NotifyUserExportFinishedMessage
    | NotifyUserExportFailedMessage;
