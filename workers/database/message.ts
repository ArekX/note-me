import { UserLoginRecord } from "$backend/repository/user-repository.ts";

export interface RepositoryRequest<
    T extends string,
    Key extends string,
    Data,
    Response,
> {
    name: T;
    key: Key;
    data: Data;
    response: Response;
}

export type GetUserRequest = RepositoryRequest<"userRepository", "getUser", {
    id: string;
}, UserLoginRecord | null>;

export type ListUserRequest = RepositoryRequest<
    "userRepository",
    "listUsers",
    never,
    { success: true }
>;

export interface DbRequest<T extends DatabaseData = DatabaseData> {
    requestId: string;
    from: string;
    data: T;
}

export type DatabaseData = GetUserRequest | ListUserRequest;
