import { DbRequest } from "./host.ts";
import {
    repositories,
    RepositoryData,
} from "$workers/database/repository/mod.ts";
import { logger } from "$backend/logger.ts";
import {
    Channel,
    createMessageTypeListener,
    Listener,
} from "../services/channel.ts";
import { ActionData, actions } from "$workers/database/actions/mod.ts";

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

const handleRepositoryKind = async (request: DbRequest<RepositoryData>) => {
    if (!(request.data.name in repositories)) {
        throw new Error(
            `Repository ${request.data.name} not found in library.`,
        );
    }

    const repo = repositories[request.data.name as keyof typeof repositories];

    if (!(request.data.key in repo)) {
        throw new Error(
            `Key ${request.data.key} not found in repository ${request.data.name}`,
        );
    }

    const method = repo[request.data.key as keyof typeof repo] as (
        data: unknown,
    ) => Promise<unknown>;

    respondFromDb(request, await method(request.data.data));
};

const handleActionKind = async (request: DbRequest<ActionData>) => {
    if (!(request.data.name in actions)) {
        throw new Error(
            `Action ${request.data.name} not found in library.`,
        );
    }

    const action = actions[request.data.name as keyof typeof actions];

    if (!(request.data.key in action)) {
        throw new Error(
            `Key ${request.data.key} not found in action ${request.data.name}`,
        );
    }

    const method = action[request.data.key as keyof typeof action] as (
        data: unknown,
    ) => Promise<unknown>;

    respondFromDb(request, await method(request.data.data));
};

export const handleMesage = async (request: DbRequest) => {
    try {
        switch (request.data.kind) {
            case "repository":
                await handleRepositoryKind(
                    request as DbRequest<RepositoryData>,
                );
                break;
            case "action":
                await handleActionKind(request as DbRequest<ActionData>);
                break;
            default:
                throw new Error(`Unknown kind`);
        }
    } catch (error) {
        respondFromDb(
            request,
            null,
            error instanceof Error ? error.message : "Unknown error",
        );
        logger.error("Error running request {kind}.{name}.{key}: {message}", {
            kind: request.data.kind,
            key: request.data.key,
            name: request.data.name,
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
