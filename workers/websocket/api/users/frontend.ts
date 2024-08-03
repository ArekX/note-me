import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CancelExportOwnDataMessage,
    CancelExportOwnDataResponse,
    CreateUserResponse,
    DeleteOwnPasskeyMessage,
    DeleteOwnPasskeyResponse,
    DeleteUserMessage,
    DeleteUserResponse,
    EncryptTextMessage,
    EncryptTextResponse,
    ExportOwnDataMessage,
    ExportOwnDataResponse,
    FindPickUsersMessage,
    FindPickUsersResponse,
    FindUsersMessage,
    FindUsersResponse,
    GetOwnPasskeysMessage,
    GetOwnPasskeysResponse,
    GetPasskeyRegistrationMessage,
    GetPasskeyRegistrationResponse,
    LogoutUserMessage,
    UpdateOnboardingStateMessage,
    UpdateOnboardingStateResponse,
    UpdateOwnPasskeyMessage,
    UpdateOwnPasskeyResponse,
    UpdateProfileMessage,
    UpdateProfileResponse,
    UpdateUserMessage,
    UpdateUserResponse,
    UserFrontendMessage,
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
    VerifyPasskeyRegistrationMessage,
    VerifyPasskeyRegistrationResponse,
} from "./messages.ts";
import { CreateUserMessage } from "$workers/websocket/api/users/messages.ts";
import {
    CreateUserData,
    createUserRecord,
    deleteUserRecord,
    findPickerUsers,
    findUsers,
    getNoteEncryptionKey,
    getUserById,
    getUserByUsername,
    updateOnboardingState,
    UpdateUserData,
    updateUserProfile,
    updateUserRecord,
    UserId,
    validateUserPassword,
} from "$backend/repository/user-repository.ts";
import {
    destroySession,
    loadSessionStateByUserId,
} from "$backend/session/mod.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { addUserSchema, updateUserSchema } from "$schemas/users.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { decryptNote, encryptNote } from "$backend/encryption.ts";
import { DecryptTextMessage } from "$workers/websocket/api/users/messages.ts";
import { DecryptTextResponse } from "$workers/websocket/api/users/messages.ts";
import { workerSendMesage } from "$workers/services/worker-bus.ts";
import { createBackendMessage } from "$workers/websocket/websocket-backend.ts";
import {
    sendAbortRequest,
    sendProcessorRequest,
} from "$workers/processor/processor-message.ts";
import { createInitialExportFile } from "$backend/export-generator.ts";
import {
    finalizePasskeyRegistration,
    initializePasskeyRegistration,
} from "$backend/passkeys.ts";
import {
    deletePasskey,
    findUserPasskeys,
    updatePasskey,
} from "$backend/repository/passkey-repository.ts";

const handleCreateUser: ListenerFn<CreateUserMessage> = async (
    { message: { data }, respond, sourceClient },
) => {
    await requireValidSchema(addUserSchema, data);
    sourceClient!.auth.require(CanManageUsers.Update);

    const existingUser = await getUserByUsername(data.username);

    let createRecord: UserId | null = null;
    if (!existingUser) {
        createRecord = await createUserRecord(
            data as CreateUserData,
        );
    } else if (existingUser.is_deleted) {
        await updateUserRecord(existingUser.id, {
            is_deleted: false,
            ...data,
        } as UpdateUserData);

        createRecord = { id: existingUser.id };
    } else {
        throw new Error("User with this username already exists.");
    }

    respond<CreateUserResponse>({
        type: "createUserResponse",
        data: createRecord,
    });
};

const handleUpdateUser: ListenerFn<UpdateUserMessage> = async (
    { message: { id, data }, respond, sourceClient },
) => {
    await requireValidSchema(updateUserSchema, data);
    sourceClient!.auth.require(CanManageUsers.Update);

    await updateUserRecord(id, data as UpdateUserData);

    respond<UpdateUserResponse>({
        type: "updateUserResponse",
        updated_id: id,
        updated_data: data,
    });
};

const handleDeleteUser: ListenerFn<DeleteUserMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    sourceClient!.auth.require(CanManageUsers.Update);
    if (id === sourceClient?.userId) {
        throw new Deno.errors.InvalidData("You cannot delete your own user.");
    }

    await deleteUserRecord(id);
    await destroySession(id);

    workerSendMesage(
        "websocket",
        createBackendMessage<LogoutUserMessage>("users", "logoutUser", {
            user_id: id,
        }),
    );

    respond<DeleteUserResponse>({
        type: "deleteUserResponse",
        deleted_id: id,
    });
};

const handleFindUsers: ListenerFn<FindUsersMessage> = async (
    { message: { filters, page }, respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageUsers.Update);

    const records = await findUsers(filters, page);

    respond<FindUsersResponse>({
        type: "findUsersResponse",
        records,
    });
};

const handleUpdateProfile: ListenerFn<UpdateProfileMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    const result = await updateUserProfile(sourceClient?.userId!, data);

    if (result) {
        const session = await loadSessionStateByUserId(sourceClient?.userId!);

        if (session) {
            await session.patch({
                user: await getUserById(sourceClient?.userId!),
            });
        }
    }

    respond<UpdateProfileResponse>({
        type: "updateProfileResponse",
        data,
    });
};

const handleFindPickUsers: ListenerFn<FindPickUsersMessage> = async (
    { message: { filters, page }, respond },
) => {
    const records = await findPickerUsers(filters, page);

    respond<FindPickUsersResponse>({
        type: "findPickUsersResponse",
        records,
    });
};

const handleUpdateOnboarding: ListenerFn<UpdateOnboardingStateMessage> = async (
    { message: { onboarding_state }, sourceClient, respond },
) => {
    const result = await updateOnboardingState(
        sourceClient?.userId!,
        onboarding_state,
    );

    if (result) {
        const session = await loadSessionStateByUserId(sourceClient?.userId!);

        if (session) {
            await session.patch({
                user: await getUserById(sourceClient?.userId!),
            });
        }
    }

    respond<UpdateOnboardingStateResponse>({
        type: "updateOnboardingResponse",
        onboarding_state,
    });
};

const handleVerifyOwnPassword: ListenerFn<VerifyOwnPasswordMessage> = async (
    { message: { password }, sourceClient, respond },
) => {
    const verified = await validateUserPassword(
        sourceClient?.userId!,
        password,
    );

    respond<VerifyOwnPasswordResponse>({
        type: "verifyOwnPasswordResponse",
        verified,
    });
};

const handleEncryptText: ListenerFn<EncryptTextMessage> = async (
    { message: { text, password }, respond, sourceClient },
) => {
    const noteEncryptionKey =
        (await getNoteEncryptionKey(sourceClient?.userId!))!;

    const encrypted = await encryptNote(
        text,
        noteEncryptionKey,
        password,
    );

    respond<EncryptTextResponse>({
        type: "encryptTextResponse",
        encrypted,
    });
};

const handleDecryptText: ListenerFn<DecryptTextMessage> = async (
    { message: { encrypted, password }, respond, sourceClient },
) => {
    const noteEncryptionKey =
        (await getNoteEncryptionKey(sourceClient?.userId!))!;

    const text = await decryptNote(
        encrypted,
        noteEncryptionKey,
        password,
    );

    respond<DecryptTextResponse>({
        type: "decryptTextResponse",
        text,
    });
};

const handleExportOwnData: ListenerFn<ExportOwnDataMessage> = async (
    { message: { user_password }, sourceClient, respond },
) => {
    const result = await createInitialExportFile(sourceClient!.userId);

    const jobId = sendProcessorRequest("create-data-export", {
        user_id: sourceClient!.userId,
        user_password: user_password,
        export_id: result.exportId,
    });

    respond<ExportOwnDataResponse>({
        type: "exportOwnDataResponse",
        export_id: result.exportId,
        job_id: jobId,
    });
};

const handleCancelExportOwnData: ListenerFn<CancelExportOwnDataMessage> = (
    { message: { job_id }, respond },
) => {
    sendAbortRequest(job_id);

    respond<CancelExportOwnDataResponse>({
        type: "cancelExportOwnDataResponse",
        job_id,
    });
};

const handleGetPasskeyRegistration: ListenerFn<GetPasskeyRegistrationMessage> =
    async (
        { respond, sourceClient },
    ) => {
        const options = await initializePasskeyRegistration(
            sourceClient!.userId,
        );

        respond<GetPasskeyRegistrationResponse>({
            type: "getPasskeyRegistrationOptionsResponse",
            options,
        });
    };

const handleVerifyPasskeyRegistration: ListenerFn<
    VerifyPasskeyRegistrationMessage
> = async (
    { message: { response }, sourceClient, respond },
) => {
    const result = await finalizePasskeyRegistration(
        sourceClient!.userId,
        response,
    );

    respond<VerifyPasskeyRegistrationResponse>({
        type: "verifyPasskeyRegistrationResponse",
        ...result,
    });
};

const handleGetOwnPasskeys: ListenerFn<GetOwnPasskeysMessage> = async (
    { message: { page }, respond, sourceClient },
) => {
    const passkeys = await findUserPasskeys(sourceClient!.userId, page);

    respond<GetOwnPasskeysResponse>({
        type: "getOwnPasskeysResponse",
        records: passkeys,
    });
};

const handleDeleteOwnPasskey: ListenerFn<DeleteOwnPasskeyMessage> = async (
    { message: { id }, respond, sourceClient },
) => {
    await deletePasskey(sourceClient!.userId, id);

    respond<DeleteOwnPasskeyResponse>({
        type: "deleteOwnPasskeyResponse",
        id,
    });
};

const handleUpdateOwnPasskey: ListenerFn<UpdateOwnPasskeyMessage> = async (
    { message, respond, sourceClient },
) => {
    await updatePasskey(message.id, sourceClient!.userId, message.name);

    respond<UpdateOwnPasskeyResponse>({
        type: "updateOwnPasskeyResponse",
        id: message.id,
        name: message.name,
    });
};

export const frontendMap: RegisterListenerMap<UserFrontendMessage> = {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    findUsers: handleFindUsers,
    findPickUsers: handleFindPickUsers,
    updateProfile: handleUpdateProfile,
    updateOnboarding: handleUpdateOnboarding,
    verifyOwnPassword: handleVerifyOwnPassword,
    encryptText: handleEncryptText,
    decryptText: handleDecryptText,
    exportOwnData: handleExportOwnData,
    cancelExportOwnData: handleCancelExportOwnData,
    getPasskeyRegistrationOptions: handleGetPasskeyRegistration,
    verifyPasskeyRegistration: handleVerifyPasskeyRegistration,
    getOwnPasskeys: handleGetOwnPasskeys,
    deleteOwnPasskey: handleDeleteOwnPasskey,
    updateOwnPasskey: handleUpdateOwnPasskey,
};
