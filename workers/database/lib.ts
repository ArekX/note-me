import { requestFromDb } from "./request.ts";
import { DatabaseData } from "$workers/database/message.ts";

type Data<Repo, Key> = Extract<DatabaseData, { name: Repo; key: Key }>["data"];
type DataResponse<Repo, Key> = Extract<
    DatabaseData,
    { name: Repo; key: Key }
>["response"];

type RepositoryFn<Repo extends DatabaseData["name"]> = {
    [L in Extract<DatabaseData, { name: Repo }>["key"]]: Data<Repo, L> extends
        never ? () => Promise<DataResponse<Repo, L>> : (
        data: Data<Repo, L>,
    ) => Promise<DataResponse<Repo, L>>;
};

type Repository = {
    [K in DatabaseData["name"]]: RepositoryFn<K>;
};

const createRepoProxy = <T extends DatabaseData["name"]>(
    repo: T,
): RepositoryFn<T> => {
    return new Proxy({} as RepositoryFn<T>, {
        get: (target, prop: keyof RepositoryFn<T>) => {
            if (!(prop in target)) {
                const fn = (data: DatabaseData["data"] | null = null) =>
                    requestFromDb(
                        repo,
                        prop as DatabaseData["key"],
                        data as DatabaseData["data"],
                    );

                target[prop] = fn as unknown as RepositoryFn<T>[typeof prop];
            }

            return target[prop];
        },
    }) as RepositoryFn<T>;
};

export const db = new Proxy({} as Repository, {
    get: (target, prop: string) => {
        if (!(prop in target)) {
            target[prop as DatabaseData["name"]] = createRepoProxy(
                prop as DatabaseData[
                    "name"
                ],
            );
        }

        return target[prop as DatabaseData["name"]];
    },
}) as Repository;
