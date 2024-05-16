import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateUserResponse,
    DeleteUserMessage,
    DeleteUserResponse,
    FindUsersMessage,
    FindUsersResponse,
    UpdateProfileMessage,
    UpdateProfileResponse,
    UpdateUserMessage,
    UpdateUserResponse,
    UserFrontendMessage,
} from "./messages.ts";
import { CreateUserMessage } from "$workers/websocket/api/users/messages.ts";
import {
    CreateUserData,
    createUserRecord,
    deleteUserRecord,
    findUsers,
    getUserById,
    UpdateUserData,
    updateUserProfile,
    updateUserRecord,
} from "$backend/repository/user-repository.ts";
import {
    destroySession,
    loadSessionStateByUserId,
} from "$backend/session/mod.ts";

const createUserRequest: ListenerFn<CreateUserMessage> = async (
    { message: { data }, respond },
) => {
    // TODO: validate the request

    const record = await createUserRecord(
        data as CreateUserData,
    );

    respond<CreateUserResponse>({
        type: "createUserResponse",
        data: record,
    });
};

const updateUserRequest: ListenerFn<UpdateUserMessage> = async (
    { message: { id, data }, respond },
) => {
    // TODO: validate the request

    await updateUserRecord(id, data as UpdateUserData);

    respond<UpdateUserResponse>({
        type: "updateUserResponse",
        updatedId: id,
        updatedData: data,
    });
};

const deleteUserRequest: ListenerFn<DeleteUserMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    // TODO: validate the request

    if (id === sourceClient?.userId) {
        throw new Deno.errors.InvalidData("You cannot delete your own user.");
    }

    await deleteUserRecord(id);
    await destroySession(id);

    respond<DeleteUserResponse>({
        type: "deleteUserResponse",
        deletedId: id,
    });
};

const findUsersRequest: ListenerFn<FindUsersMessage> = async (
    { message: { filters, page }, respond },
) => {
    // TODO: validate the request

    const records = await findUsers(filters, page);

    respond<FindUsersResponse>({
        type: "findUsersResponse",
        records,
    });
};

const updateProfileRequest: ListenerFn<UpdateProfileMessage> = async (
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

export const frontendMap: RegisterListenerMap<UserFrontendMessage> = {
    createUser: createUserRequest,
    updateUser: updateUserRequest,
    deleteUser: deleteUserRequest,
    findUsers: findUsersRequest,
    updateProfile: updateProfileRequest,
};
