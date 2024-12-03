import { JobDefinition, JobNames } from "$workers/processor/jobs/mod.ts";
import { workerSendMesage } from "$workers/services/worker-bus.ts";

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

export const sendProcessorRequest = <T extends JobNames>(
    name: T,
    job: Parameters<JobDefinition[T]>["0"],
) => {
    const jobId = crypto.randomUUID();

    workerSendMesage<ProcessorRequestMessage, ProcessorMessageKey>(
        "processor",
        "process",
        {
            type: "process",
            jobId,
            name,
            job,
        },
    );

    return jobId;
};

export const sendAbortRequest = (jobId: string) => {
    workerSendMesage<ProcessorRequestMessage, ProcessorMessageKey>(
        "processor",
        "abort",
        {
            type: "abort",
            jobId,
        },
    );
};
