import { RepositoryData } from "$workers/database/repository/mod.ts";
import { ActionData } from "$workers/database/actions/mod.ts";
import { requestFromDb } from "./host.ts";

export * from "./types.ts";

export * from "./host.ts";

export type DatabaseData = RepositoryData | ActionData;

type Data<Repo, Key> = Extract<DatabaseData, { name: Repo; key: Key }>["data"];
type DataResponse<Repo, Key> = Extract<
    DatabaseData,
    { name: Repo; key: Key }
>["response"];

type HandlerFn<
    Handler extends DatabaseData["name"],
    Kind extends DatabaseData,
> = {
    [L in Extract<Kind, { name: Handler }>["key"]]: Data<Handler, L> extends
        never ? () => Promise<DataResponse<Handler, L>> : (
        data: Data<Handler, L>,
    ) => Promise<DataResponse<Handler, L>>;
};

type Repository = {
    [K in RepositoryData["name"]]: HandlerFn<K, RepositoryData>;
};

type Action = {
    [K in ActionData["name"]]: HandlerFn<K, ActionData>;
};

type Handler = Repository | Action;

const createRepoProxy = <Kind extends DatabaseData, T extends Kind["name"]>(
    kind: DatabaseData["kind"],
    repo: T,
): HandlerFn<T, Kind> => {
    return new Proxy({} as HandlerFn<T, Kind>, {
        get: (target, prop: keyof HandlerFn<T, Kind>) => {
            if (!(prop in target)) {
                const fn = (data: DatabaseData["data"] | null = null) =>
                    requestFromDb(
                        repo,
                        kind,
                        prop as DatabaseData["key"],
                        data as DatabaseData["data"],
                    );

                target[prop] = fn as unknown as HandlerFn<T, Kind>[typeof prop];
            }

            return target[prop];
        },
    }) as HandlerFn<T, Kind>;
};

const createKindProxy = <T extends Handler, KindData extends DatabaseData>(
    kind: KindData["kind"],
): T => {
    return new Proxy({} as T, {
        get: (target, prop: string) => {
            if (!(prop in target)) {
                target[prop as keyof T] = createRepoProxy<
                    KindData,
                    KindData["name"]
                >(
                    kind,
                    prop as DatabaseData[
                        "name"
                    ],
                ) as unknown as T[keyof T];
            }

            return target[prop as keyof T];
        },
    }) as T;
};

export const repository = createKindProxy<Repository, RepositoryData>(
    "repository",
);
export const action = createKindProxy<Action, ActionData>("action");
