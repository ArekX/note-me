export interface RepositoryRequest<T extends string, Key extends string, Data> {
    name: T;
    key: Key;
    data: Data;
}

export type GetUserRequest = RepositoryRequest<"UserRepository", "getUser", {
    id: string;
}>;

export interface DbRequest<T extends DatabaseData = DatabaseData> {
    requestId: string;
    from: string;
    data: T;
}

export type DatabaseData = GetUserRequest;
