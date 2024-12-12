import { createWorkerChannel } from "$workers/channel/mod.ts";
import { connectHostChannelForDatabase } from "../database/host.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import { connectHostChannelForWebsocket } from "$workers/websocket/host.ts";

declare const self: DedicatedWorkerGlobalScope;

const channelWorker = createWorkerChannel("periodic-task", self);

connectHostChannelForDatabase(channelWorker);
connectHostChannelForWebsocket(channelWorker);

export const waitUntilChannelReady = () => workerNotifyReady(channelWorker);
