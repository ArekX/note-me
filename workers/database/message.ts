import { BackupTargetRepository } from "$workers/database/repository/backup-target.ts";

export interface RepositoryRequest<
    T extends string = string,
    Key extends string = string,
    Data = unknown,
    Response = unknown,
> {
    name: T;
    key: Key;
    data: Data;
    response: Response;
}

export type RepositoryHandlerMap<T extends RepositoryRequest> = {
    [K in T["key"]]: (
        data: Extract<T, { key: K }>["data"],
    ) => Promise<Extract<T, { key: K }>["response"]>;
};

export interface DbRequest<T extends DatabaseData = DatabaseData> {
    requestId: string;
    from: string;
    data: T;
}

export type DatabaseData = BackupTargetRepository;
