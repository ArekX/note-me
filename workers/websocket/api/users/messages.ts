import { Message } from "$workers/websocket/types.ts";
import { AddUserRequest, UpdateUserRequest } from "$schemas/users.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import {
    FindShareUserFilters,
    FindUserFilters,
    ShareUserRecord,
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
    { data: UserProfileData }
>;

export type UpdateProfileResponse = UserMessage<
    "updateProfileResponse",
    { data: UserProfileData }
>;

export type FindShareUsersMessage = UserMessage<
    "findShareUsers",
    { filters: FindShareUserFilters; page: number }
>;

export type FindShareUsersResponse = UserMessage<
    "findShareUsersResponse",
    {
        records: Paged<ShareUserRecord>;
    }
>;

export type UserFrontendResponse =
    | CreateUserResponse
    | UpdateUserResponse
    | DeleteUserResponse
    | FindUsersResponse
    | UpdateProfileResponse
    | FindShareUsersResponse;

export type UserFrontendMessage =
    | CreateUserMessage
    | UpdateUserMessage
    | DeleteUserMessage
    | FindUsersMessage
    | UpdateProfileMessage
    | FindShareUsersMessage;
