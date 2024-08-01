import { createDataExportJobHandler } from "$workers/processor/jobs/create-data-export.ts";
import {
    createPdfBookHandler,
} from "$workers/processor/jobs/create-pdf-book.ts";

export type JobHandler<T extends ProcessorJob> = (
    job: T,
    abortSignal: AbortSignal,
) => Promise<void>;

export interface RunningJob<T extends ProcessorJob = ProcessorJob> {
    id: string;
    abortController: AbortController;
    run: JobHandler<T>;
}

export const jobDefinitions = {
    "create-data-export": createDataExportJobHandler,
    "create-pdf-book": createPdfBookHandler,
} as const;

export type JobDefinition = typeof jobDefinitions;

export type ProcessorJob<T extends JobNames = JobNames> = Parameters<
    JobDefinition[T]
>["0"];

export type JobNames = keyof JobDefinition;

export type JobMap = { [K in keyof JobDefinition]: JobDefinition[K] };
