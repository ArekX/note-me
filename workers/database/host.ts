import {
    Channel,
    createMessageTypeListener,
    Listener,
} from "../services/channel.ts";
import { DatabaseData } from "$workers/database/lib.ts";

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

let connectedChannel: Channel | null = null;

export const connectHostChannelForDatabase = (channel: Channel) => {
    channel.onReceive(
        createMessageTypeListener<DatabaseResponse>(
            "workerResponse",
            ({ message }) => {
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
        ) as Listener,
    );

    connectedChannel = channel;
};

export const requestFromDb = <Request extends DatabaseData, Response>(
    repo: Request["name"],
    kind: Request["kind"],
    key: Request["key"],
    data: Request["data"],
) => {
    const message: DbRequest<Request> = {
        requestId: crypto.randomUUID(),
        from: connectedChannel!.name,
        data: {
            name: repo,
            kind,
            key,
            data,
        } as Request,
    };
    return new Promise<DatabaseResponse<Response>>((resolve, reject) => {
        pendingRequests[message.requestId] = {
            resolve,
            reject,
        } as PendingResolver;

        connectedChannel!.send({
            from: connectedChannel!.name,
            to: "database",
            type: "workerRequest",
            message,
        });
    });
};
