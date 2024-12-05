import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    checkIfUserExists,
    CreateUserData,
    createUserRecord,
    deleteUserRecord,
    findPickerUsers,
    FindUserFilters,
    findUsers,
    getNoteEncryptionKey,
    getUserById,
    getUserByLogin,
    getUserByUsername,
    PickUserRecord,
    updateOnboardingState,
    UpdateUserData,
    updateUserProfile,
    updateUserRecord,
    UserId,
    UserIdExistence,
    UserLoginRecord,
    UserOnboardingState,
    UserProfileData,
    UserRecord,
    validateUserPassword,
} from "$backend/repository/user-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

type UserRequest<Key extends string, Request, Response> = RepositoryRequest<
    "user",
    Key,
    Request,
    Response
>;

type CheckUserIfExists = UserRequest<"checkIfUserExists", string, boolean>;
type GetUserByLogin = UserRequest<
    "getUserByLogin",
    { username: string; password: string },
    UserLoginRecord | null
>;
type GetUserByUsername = UserRequest<
    "getUserByUsername",
    string,
    UserIdExistence
>;
type GetUserById = UserRequest<"getUserById", number, UserLoginRecord | null>;
type CreateUserRecord = UserRequest<"createUserRecord", CreateUserData, UserId>;
type UpdateUserRecord = UserRequest<
    "updateUserRecord",
    { user_id: number; user: UpdateUserData },
    boolean
>;
type FindUsers = UserRequest<"findUsers", {
    filters: FindUserFilters;
    page: number;
}, Paged<UserRecord>>;
type FindPickerUsers = UserRequest<"findPickerUsers", {
    filters: FindUserFilters;
    page: number;
}, Paged<PickUserRecord>>;
type UpdateUserProfile = UserRequest<"updateUserProfile", {
    profile_user_id: number;
    data: Partial<UserProfileData>;
}, boolean>;
type ValidateUserPassword = UserRequest<"validateUserPassword", {
    user_id: number;
    password: string;
}, boolean>;
type DeleteUserRecord = UserRequest<"deleteUserRecord", number, boolean>;
type UpdateOnboardingState = UserRequest<"updateOnboardingState", {
    user_id: number;
    state: UserOnboardingState;
}, boolean>;
type GetNoteEncryptionKey = UserRequest<
    "getNoteEncryptionKey",
    number,
    string | null
>;

export type UserRepository =
    | CheckUserIfExists
    | GetUserByLogin
    | GetUserByUsername
    | GetUserById
    | CreateUserRecord
    | UpdateUserRecord
    | FindUsers
    | FindPickerUsers
    | UpdateUserProfile
    | ValidateUserPassword
    | DeleteUserRecord
    | UpdateOnboardingState
    | GetNoteEncryptionKey;

export const user: RepositoryHandlerMap<UserRepository> = {
    checkIfUserExists,
    getUserByLogin: ({ username, password }) =>
        getUserByLogin(username, password),
    getUserByUsername,
    getUserById,
    createUserRecord,
    updateUserRecord: ({ user_id, user }) => updateUserRecord(user_id, user),
    findUsers: ({ filters, page }) => findUsers(filters, page),
    findPickerUsers: ({ filters, page }) => findPickerUsers(filters, page),
    updateUserProfile: ({ profile_user_id, data }) =>
        updateUserProfile(profile_user_id, data),
    validateUserPassword: ({ user_id, password }) =>
        validateUserPassword(user_id, password),
    deleteUserRecord,
    updateOnboardingState: ({ user_id, state }) =>
        updateOnboardingState(user_id, state),
    getNoteEncryptionKey,
};
