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
    UpdateOnboardingStateMessage,
    UpdateOnboardingStateResponse,
    UpdateOwnPasskeyMessage,
    UpdateOwnPasskeyResponse,
    UpdateProfileMessage,
    UpdateProfileResponse,
    UpdateUserMessage,
    UpdateUserResponse,
    UserForceLogoutResponse,
    UserFrontendMessage,
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
    VerifyPasskeyRegistrationMessage,
    VerifyPasskeyRegistrationResponse,
} from "./messages.ts";
import { CreateUserMessage } from "$workers/websocket/api/users/messages.ts";
import { CreateUserData, repository, UserId } from "$db";
import {
    destroySession,
    loadSessionStateByUserId,
} from "$backend/session/mod.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addUserSchema,
    updateUserSchema,
    userProfileSchema,
} from "$schemas/users.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { decryptNote, encryptNote } from "$backend/encryption.ts";
import { DecryptTextMessage } from "$workers/websocket/api/users/messages.ts";
import { DecryptTextResponse } from "$workers/websocket/api/users/messages.ts";
import {
    sendAbortRequest,
    sendProcessorRequest,
} from "$workers/processor/host.ts";
import { createInitialExportFile } from "$backend/export-generator.ts";
import {
    finalizePasskeyRegistration,
    initializePasskeyRegistration,
} from "$backend/passkeys.ts";

const handleCreateUser: ListenerFn<CreateUserMessage> = async (
    { message: { data }, respond, sourceClient },
) => {
    await requireValidSchema(addUserSchema, data);
    sourceClient!.auth.require(CanManageUsers.Update);

    const existingUser = await repository.user.getUserByUsername(data.username);

    let createRecord: UserId | null = null;
    if (!existingUser) {
        createRecord = await repository.user.createUserRecord(
            data as CreateUserData,
        );
    } else if (existingUser.is_deleted) {
        await repository.user.updateUserRecord({
            user_id: existingUser.id,
            user: {
                is_deleted: false,
                ...data,
            },
        });

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

    await repository.user.updateUserRecord({
        user_id: id,
        user: data,
    });

    respond<UpdateUserResponse>({
        type: "updateUserResponse",
        updated_id: id,
        updated_data: data,
    });
};

const handleDeleteUser: ListenerFn<DeleteUserMessage> = async (
    { message: { id, requestId }, sourceClient, respond, service },
) => {
    sourceClient!.auth.require(CanManageUsers.Update);
    if (id === sourceClient?.userId) {
        throw new Deno.errors.InvalidData("You cannot delete your own user.");
    }

    await repository.user.deleteUserRecord(id);
    await destroySession(id);

    const client = service.getClientByUserId(id);

    client?.send<UserForceLogoutResponse>({
        requestId,
        namespace: "users",
        type: "forceLogoutResponse",
    });

    respond<DeleteUserResponse>({
        type: "deleteUserResponse",
        deleted_id: id,
    });
};

const handleFindUsers: ListenerFn<FindUsersMessage> = async (
    { message: { filters, page }, respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageUsers.Update);

    const records = await repository.user.findUsers({ filters, page });

    respond<FindUsersResponse>({
        type: "findUsersResponse",
        records,
    });
};

const handleUpdateProfile: ListenerFn<UpdateProfileMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(userProfileSchema, data);

    if (data.old_password && data.old_password === data.new_password) {
        throw new Deno.errors.InvalidData(
            "New password must be different from the old password.",
        );
    }

    const result = await repository.user.updateUserProfile({
        data,
        profile_user_id: sourceClient?.userId!,
    });

    if (result) {
        const session = await loadSessionStateByUserId(sourceClient?.userId!);

        if (session) {
            await session.patch({
                user: await repository.user.getUserById(sourceClient?.userId!),
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
    const records = await repository.user.findPickerUsers({ filters, page });

    respond<FindPickUsersResponse>({
        type: "findPickUsersResponse",
        records,
    });
};

const handleUpdateOnboarding: ListenerFn<UpdateOnboardingStateMessage> = async (
    { message: { onboarding_state }, sourceClient, respond },
) => {
    const result = await repository.user.updateOnboardingState({
        state: onboarding_state,
        user_id: sourceClient?.userId!,
    });

    if (result) {
        const session = await loadSessionStateByUserId(sourceClient?.userId!);

        if (session) {
            await session.patch({
                user: await repository.user.getUserById(sourceClient?.userId!),
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
    const verified = await repository.user.validateUserPassword({
        password,
        user_id: sourceClient?.userId!,
    });

    respond<VerifyOwnPasswordResponse>({
        type: "verifyOwnPasswordResponse",
        verified,
    });
};

const handleEncryptText: ListenerFn<EncryptTextMessage> = async (
    { message: { text, password }, respond, sourceClient },
) => {
    const noteEncryptionKey =
        (await repository.user.getNoteEncryptionKey(sourceClient?.userId!))!;

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
        (await repository.user.getNoteEncryptionKey(sourceClient?.userId!))!;

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
    const passkeys = await repository.passkey.findUserPasskeys({
        user_id: sourceClient!.userId,
        page,
    });

    respond<GetOwnPasskeysResponse>({
        type: "getOwnPasskeysResponse",
        records: passkeys,
    });
};

const handleDeleteOwnPasskey: ListenerFn<DeleteOwnPasskeyMessage> = async (
    { message: { id }, respond, sourceClient },
) => {
    await repository.passkey.deletePasskey({
        user_id: sourceClient!.userId,
        passkey_id: id,
    });

    respond<DeleteOwnPasskeyResponse>({
        type: "deleteOwnPasskeyResponse",
        id,
    });
};

const handleUpdateOwnPasskey: ListenerFn<UpdateOwnPasskeyMessage> = async (
    { message: { id, name }, respond, sourceClient },
) => {
    await repository.passkey.updatePasskey({
        id,
        user_id: sourceClient!.userId,
        name,
    });

    respond<UpdateOwnPasskeyResponse>({
        type: "updateOwnPasskeyResponse",
        id: id,
        name: name,
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
