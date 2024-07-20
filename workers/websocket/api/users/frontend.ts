import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateUserResponse,
    DeleteUserMessage,
    DeleteUserResponse,
    FindPickUsersMessage,
    FindPickUsersResponse,
    FindUsersMessage,
    FindUsersResponse,
    UpdateOnboardingStateMessage,
    UpdateOnboardingStateResponse,
    UpdateProfileMessage,
    UpdateProfileResponse,
    UpdateUserMessage,
    UpdateUserResponse,
    UserFrontendMessage,
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
} from "./messages.ts";
import { CreateUserMessage } from "$workers/websocket/api/users/messages.ts";
import {
    CreateUserData,
    createUserRecord,
    deleteUserRecord,
    findPickerUsers,
    findUsers,
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

const handleCreateUser: ListenerFn<CreateUserMessage> = async (
    { message: { data }, respond, sourceClient },
) => {
    await requireValidSchema(addUserSchema, data);
    sourceClient!.auth.require(CanManageUsers.Create);

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
    sourceClient!.auth.require(CanManageUsers.Delete);
    if (id === sourceClient?.userId) {
        throw new Deno.errors.InvalidData("You cannot delete your own user.");
    }

    await deleteUserRecord(id);
    await destroySession(id);

    respond<DeleteUserResponse>({
        type: "deleteUserResponse",
        deleted_id: id,
    });
};

const handleFindUsers: ListenerFn<FindUsersMessage> = async (
    { message: { filters, page }, respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageUsers.List);

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

export const frontendMap: RegisterListenerMap<UserFrontendMessage> = {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    findUsers: handleFindUsers,
    findPickUsers: handleFindPickUsers,
    updateProfile: handleUpdateProfile,
    updateOnboarding: handleUpdateOnboarding,
    verifyOwnPassword: handleVerifyOwnPassword,
};
