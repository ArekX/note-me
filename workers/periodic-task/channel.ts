import { createWorkerChannel } from "$workers/channel/mod.ts";
import { connectHostChannel } from "$workers/database/request.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";

declare const self: DedicatedWorkerGlobalScope;

const channelWorker = createWorkerChannel("periodic-task", self);

connectHostChannel(channelWorker);

export const waitUntilChannelReady = () => workerNotifyReady(channelWorker);
