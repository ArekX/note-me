import { createWorkerChannel } from "$workers/channel/mod.ts";
import { connectHostChannel } from "$workers/database/request.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import {
    AbortJobRequest,
    ProcessJobRequest,
} from "$workers/processor/processor-message.ts";
import { processorService } from "$workers/processor/processor-service.ts";

declare const self: DedicatedWorkerGlobalScope;

const channelWorker = createWorkerChannel("periodic-task", self);

connectHostChannel(channelWorker);

channelWorker.listen<ProcessJobRequest>("process", ({ message }) => {
    processorService.processRequest(message);
});

channelWorker.listen<AbortJobRequest>("abort", ({ message }) => {
    processorService.abortRequest(message);
});

export const waitUntilChannelReady = () => workerNotifyReady(channelWorker);
