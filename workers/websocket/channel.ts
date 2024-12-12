import { createWorkerChannel } from "../services/channel.ts";
import { connectHostChannelForDatabase } from "$db";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import { websocketService } from "$workers/websocket/websocket-service.ts";
import { Message } from "$workers/websocket/types.ts";
import { connectHostChannelForProcessor } from "$workers/processor/host.ts";

declare const self: DedicatedWorkerGlobalScope;

const workerChannel = createWorkerChannel("websocket", self);

connectHostChannelForDatabase(workerChannel);
connectHostChannelForProcessor(workerChannel);

workerChannel.listen<Message>("backendRequest", ({ message }) => {
    websocketService.handleBackendRequest(message);
});

export const waitUntilChannelReady = () => workerNotifyReady(workerChannel);
