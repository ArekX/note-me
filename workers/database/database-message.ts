import {
    connectWorkerMessageListener,
    getConnectedWorkerName,
    workerSendMesage,
} from "$workers/services/worker-bus.ts";
import { DatabaseData, DbRequest } from "$workers/database/message.ts";

export interface DatabaseResponse<T = unknown> {
    forRequestId: string;
    data: T;
}

export type DatabaseMessageKey = "databaseRequest" | "databaseResponse";

type PendingResolveFn = (response: DatabaseResponse) => void;

const pendingRequests: { [key: string]: PendingResolveFn } = {};

export const connectDbMessageListener = () => {
    connectWorkerMessageListener<DatabaseResponse, DatabaseMessageKey>(
        "databaseResponse",
        (message) => {
            const { forRequestId } = message;

            if (!pendingRequests[forRequestId]) {
                return;
            }

            pendingRequests[forRequestId](message);

            delete pendingRequests[forRequestId];
        },
    );
};

export const requestFromDb = <Request extends DatabaseData, Response>(
    repoKey: `${Request["name"]}.${Request["key"]}`,
    data: Request["data"],
) => {
    const [repository, key] = repoKey.split(".");
    const message: DbRequest<Request> = {
        requestId: crypto.randomUUID(),
        from: getConnectedWorkerName()!,
        data: {
            name: repository,
            key,
            data,
        } as Request,
    };

    return new Promise<DatabaseResponse<Response>>((resolve) => {
        pendingRequests[message.requestId] = resolve as PendingResolveFn;

        workerSendMesage<DbRequest<Request>, DatabaseMessageKey>(
            "database",
            "databaseRequest",
            message,
        );
    });
};
