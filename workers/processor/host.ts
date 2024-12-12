import { JobDefinition, JobNames } from "$workers/processor/jobs/mod.ts";
import { Channel, ChannelMessage } from "$workers/channel/mod.ts";

export interface ProcessJobRequest<T extends keyof JobDefinition = JobNames> {
    type: "process";
    name: T;
    jobId: string;
    job: Parameters<JobDefinition[T]>["0"];
}

export interface AbortJobRequest {
    type: "abort";
    jobId: string;
}

export type ProcessorRequestMessage = ProcessJobRequest | AbortJobRequest;

export type ProcessorMessageKey = ProcessorRequestMessage["type"];

let connectedChannel: Channel | null = null;

export const connectHostChannelForProcessor = (channel: Channel) => {
    connectedChannel = channel;
};

const sendToProcessor = <T extends ProcessorRequestMessage>(
    message: T,
) => {
    connectedChannel!.send({
        from: "app",
        message,
        to: "processor",
        type: message.type,
    } as ChannelMessage<
        T,
        "app" | "processor",
        ProcessorMessageKey
    >);
};

export const sendProcessorRequest = <T extends JobNames>(
    name: T,
    job: Parameters<JobDefinition[T]>["0"],
) => {
    const jobId = crypto.randomUUID();

    sendToProcessor({
        type: "process",
        jobId,
        name,
        job,
    });

    return jobId;
};

export const sendAbortRequest = (jobId: string) => {
    sendToProcessor({
        type: "abort",
        jobId,
    });
};
