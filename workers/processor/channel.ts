import { createWorkerChannel } from "$workers/channel/mod.ts";
import { connectHostChannelForDatabase } from "../database/host.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import { AbortJobRequest, ProcessJobRequest } from "./host.ts";
import { processorService } from "$workers/processor/processor-service.ts";
import { connectHostChannelForWebsocket } from "$workers/websocket/host.ts";

declare const self: DedicatedWorkerGlobalScope;

export const channelWorker = createWorkerChannel("processor", self);

connectHostChannelForDatabase(channelWorker);
connectHostChannelForWebsocket(channelWorker);

channelWorker.listen<ProcessJobRequest>("process", ({ message }) => {
    processorService.processRequest(message);
});

channelWorker.listen<AbortJobRequest>("abort", ({ message }) => {
    processorService.abortRequest(message);
});

export const waitUntilChannelReady = () => workerNotifyReady(channelWorker);
