import {
    connectWorkerMessageListener,
    getConnectedWorkerName,
    workerSendMesage,
} from "$workers/services/worker-bus.ts";
import { DatabaseData } from "$workers/database/message.ts";

export interface DatabaseResponse<T = unknown> {
    forRequestId: string;
    errorMessage: string | null;
    data: T | null;
}

export type DatabaseMessageKey = "databaseRequest" | "databaseResponse";

type PendingResolver = {
    resolve: (response: DatabaseResponse["data"]) => void;
    reject: (error: string) => void;
};

export interface DbRequest<T extends DatabaseData = DatabaseData> {
    requestId: string;
    from: string;
    data: T;
}

const pendingRequests: { [key: string]: PendingResolver } = {};

export const connectDbMessageListener = () => {
    connectWorkerMessageListener<DatabaseResponse, DatabaseMessageKey>(
        "databaseResponse",
        (message) => {
            const { forRequestId, errorMessage, data } = message;

            if (!pendingRequests[forRequestId]) {
                return;
            }

            if (errorMessage) {
                pendingRequests[forRequestId].reject(errorMessage);
            } else {
                pendingRequests[forRequestId].resolve(data);
            }

            delete pendingRequests[forRequestId];
        },
    );
};

export const requestFromDb = <Request extends DatabaseData, Response>(
    repo: Request["name"],
    key: Request["key"],
    data: Request["data"],
) => {
    const message: DbRequest<Request> = {
        requestId: crypto.randomUUID(),
        from: getConnectedWorkerName()!,
        data: {
            name: repo,
            key,
            data,
        } as Request,
    };

    return new Promise<DatabaseResponse<Response>>((resolve, reject) => {
        pendingRequests[message.requestId] = {
            resolve,
            reject,
        } as PendingResolver;

        workerSendMesage<DbRequest<Request>, DatabaseMessageKey>(
            "database",
            "databaseRequest",
            message,
        );
    });
};
