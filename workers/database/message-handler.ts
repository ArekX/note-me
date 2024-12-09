import { DbRequest } from "./request.ts";
import { repositories } from "$workers/database/repository/mod.ts";
import { logger } from "$backend/logger.ts";
import {
    Channel,
    createMessageTypeListener,
    Listener,
} from "$workers/channel/mod.ts";

let channel: Channel | null = null;

export const connectWorkerChannel = (newChannel: Channel) => {
    if (channel) {
        throw new Error("Database channel already connected");
    }

    newChannel.onReceive(
        createMessageTypeListener<DbRequest>(
            "workerRequest",
            (recv) => {
                handleMesage(recv.message);
            },
        ) as Listener,
    );

    channel = newChannel;
};

const respondFromDb = <T>(
    fromRequest: DbRequest,
    response: T | null,
    errorMessage: string | null = null,
) => {
    channel!.send({
        from: "database",
        to: fromRequest.from,
        type: "workerResponse",
        message: {
            forRequestId: fromRequest.requestId,
            errorMessage,
            data: response,
        },
    });
};

export const handleMesage = async (request: DbRequest) => {
    try {
        if (!(request.data.name in repositories)) {
            throw new Error(
                `Repository ${request.data.name} not found in database library.`,
            );
        }

        const repo =
            repositories[request.data.name as keyof typeof repositories];

        if (!(request.data.key in repo)) {
            throw new Error(
                `Key ${request.data.key} not found in repository ${request.data.name}`,
            );
        }

        const method = repo[request.data.key as keyof typeof repo] as (
            data: unknown,
        ) => Promise<unknown>;

        const response = await method(request.data.data);

        respondFromDb(request, response);
    } catch (error) {
        respondFromDb(
            request,
            null,
            error instanceof Error ? error.message : "Unknown error",
        );
        logger.error(error);
    }
};
