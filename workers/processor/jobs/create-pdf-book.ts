import { JobHandler } from "$workers/processor/jobs/mod.ts";

export interface CreatePdfBookJob {
    user_id: number;
    group_id: number | null;
}

export const createPdfBookHandler: JobHandler<CreatePdfBookJob> = (job) => {
    console.log("Creating pdf book", job.user_id, job.group_id);
    return Promise.resolve();
};
