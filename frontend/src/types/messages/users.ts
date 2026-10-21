import type {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type { Message } from "./base";
import type {
    FindPickUserFilters,
    FindUserFilters,
    McpClientRecord,
    Paged,
    PickUserRecord,
    RegistrationResult,
    SessionResponse,
    UserId,
    UserOnboardingState,
    UserPasskeyRecord,
    UserRecord,
} from "../records";
import type { McpClientRequest, NewMcpClientRequest } from "@/schemas/mcp";
import type {
    AddUserRequest,
    EditUserProfile,
    UpdateUserRequest,
} from "@/schemas/users";

type UserMessage<Type extends string, Data = unknown> = Message<
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

export type DeleteUserMessage = UserMessage<"deleteUser", { id: number }>;
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
    { records: Paged<UserRecord> }
>;

export type UpdateProfileMessage = UserMessage<
    "updateProfile",
    { data: EditUserProfile }
>;
export type UpdateProfileResponse = UserMessage<
    "updateProfileResponse",
    { data: EditUserProfile }
>;

// Not in the original app; null removes the picture.
export type UpdateProfilePictureMessage = UserMessage<
    "updateProfilePicture",
    { identifier: string | null }
>;
export type UpdateProfilePictureResponse = UserMessage<
    "updateProfilePictureResponse",
    { identifier: string | null }
>;

export type FindPickUsersMessage = UserMessage<
    "findPickUsers",
    { filters: FindPickUserFilters; page: number }
>;
export type FindPickUsersResponse = UserMessage<
    "findPickUsersResponse",
    { records: Paged<PickUserRecord> }
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

export type UserForceLogoutResponse = UserMessage<"forceLogoutResponse">;

// Not in the original app (decision 0.4).
export type UserSessionUpdatedMessage = UserMessage<
    "sessionUpdated",
    SessionResponse
>;

// The password is asked for once per session every five minutes (decision 0.50).
export type GetPasskeyRegistrationMessage = UserMessage<
    "getPasskeyRegistrationOptions",
    { password?: string }
>;
export type GetPasskeyRegistrationResponse = UserMessage<
    "getPasskeyRegistrationOptionsResponse",
    {
        password_required: boolean;
        options?: PublicKeyCredentialCreationOptionsJSON;
    }
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

export type GetMcpClientsMessage = UserMessage<"getMcpClients">;
export type GetMcpClientsResponse = UserMessage<
    "getMcpClientsResponse",
    { clients: McpClientRecord[] }
>;

export type CreateMcpClientMessage = UserMessage<
    "createMcpClient",
    { data: NewMcpClientRequest }
>;
export type CreateMcpClientResponse = UserMessage<
    "createMcpClientResponse",
    { client: McpClientRecord; secret?: string }
>;

export type UpdateMcpClientMessage = UserMessage<
    "updateMcpClient",
    { id: number; data: McpClientRequest }
>;
export type UpdateMcpClientResponse = UserMessage<
    "updateMcpClientResponse",
    { client: McpClientRecord }
>;

export type DeleteMcpClientMessage = UserMessage<
    "deleteMcpClient",
    { id: number }
>;
export type DeleteMcpClientResponse = UserMessage<
    "deleteMcpClientResponse",
    { id: number }
>;

export type RegenerateMcpClientSecretMessage = UserMessage<
    "regenerateMcpClientSecret",
    { id: number }
>;
export type RegenerateMcpClientSecretResponse = UserMessage<
    "regenerateMcpClientSecretResponse",
    { client: McpClientRecord; secret: string }
>;

export type McpClientFrontendMessage =
    | GetMcpClientsMessage
    | CreateMcpClientMessage
    | UpdateMcpClientMessage
    | DeleteMcpClientMessage
    | RegenerateMcpClientSecretMessage;

export type UserFrontendMessage =
    | CreateUserMessage
    | UpdateUserMessage
    | DeleteUserMessage
    | FindUsersMessage
    | UpdateProfileMessage
    | UpdateProfilePictureMessage
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
    | UpdateOwnPasskeyMessage
    | McpClientFrontendMessage;

export type UserFrontendResponse =
    | CreateUserResponse
    | UpdateUserResponse
    | DeleteUserResponse
    | FindUsersResponse
    | UpdateProfileResponse
    | UpdateProfilePictureResponse
    | FindPickUsersResponse
    | UpdateOnboardingStateResponse
    | VerifyOwnPasswordResponse
    | EncryptTextResponse
    | DecryptTextResponse
    | UserForceLogoutResponse
    | UserSessionUpdatedMessage
    | ExportOwnDataResponse
    | ExportOwnDataPercentageUpdate
    | ExportOwnDataFinished
    | ExportOwnDataFailed
    | CancelExportOwnDataResponse
    | GetPasskeyRegistrationResponse
    | VerifyPasskeyRegistrationResponse
    | GetOwnPasskeysResponse
    | DeleteOwnPasskeyResponse
    | UpdateOwnPasskeyResponse
    | GetMcpClientsResponse
    | CreateMcpClientResponse
    | UpdateMcpClientResponse
    | DeleteMcpClientResponse
    | RegenerateMcpClientSecretResponse;

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
