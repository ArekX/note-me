import { createWorkerChannel } from "$workers/channel/mod.ts";
import { connectHostChannel } from "$workers/database/request.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import { websocketService } from "$workers/websocket/websocket-service.ts";
import { Message } from "$workers/websocket/types.ts";

declare const self: DedicatedWorkerGlobalScope;

const workerChannel = createWorkerChannel("websocket", self);

connectHostChannel(workerChannel);

workerChannel.listen<Message>("backendRequest", ({ message }) => {
    websocketService.handleBackendRequest(message);
});

export const waitUntilChannelReady = () => workerNotifyReady(workerChannel);
