import { Message } from "$workers/websocket/types.ts";
import { AddUserRequest, UpdateUserRequest } from "$schemas/users.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import {
    FindUserFilters,
    UserId,
    UserProfileData,
    UserRecord,
} from "$backend/repository/user-repository.ts";

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
    { updatedId: number; updatedData: UpdateUserRequest }
>;

export type DeleteUserMessage = UserMessage<
    "deleteUser",
    { id: number }
>;

export type DeleteUserResponse = UserMessage<
    "deleteUserResponse",
    { deletedId: number }
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
    { data: UserProfileData }
>;

export type UpdateProfileResponse = UserMessage<
    "updateProfileResponse",
    { data: UserProfileData }
>;

export type UserFrontendResponse =
    | CreateUserResponse
    | UpdateUserResponse
    | DeleteUserResponse
    | FindUsersResponse
    | UpdateProfileResponse;

export type UserFrontendMessage =
    | CreateUserMessage
    | UpdateUserMessage
    | DeleteUserMessage
    | FindUsersMessage
    | UpdateProfileMessage;
