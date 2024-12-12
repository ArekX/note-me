import { createWorkerChannel } from "../services/channel.ts";
import { connectHostChannelForDatabase } from "$db";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";
import { connectHostChannelForWebsocket } from "$workers/websocket/host.ts";

declare const self: DedicatedWorkerGlobalScope;

const channelWorker = createWorkerChannel("periodic-task", self);

connectHostChannelForDatabase(channelWorker);
connectHostChannelForWebsocket(channelWorker);

export const waitUntilChannelReady = () => workerNotifyReady(channelWorker);
