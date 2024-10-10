import { logger } from "$backend/logger.ts";
import {
    jobDefinitions,
    JobHandler,
    ProcessorJob,
    RunningJob,
} from "$workers/processor/jobs/mod.ts";
import {
    AbortJobRequest,
    ProcessJobRequest,
} from "$workers/processor/processor-message.ts";

const runningJobs = new Map<string, RunningJob>();

const abortRequest = (message: AbortJobRequest) => {
    const job = runningJobs.get(message.jobId);

    if (!job) {
        logger.error("No running job found to abort with id: {jobId}", {
            jobId: message.jobId,
        });
        return;
    }

    logger.info("Aborting job: {jobId}", {
        jobId: message.jobId,
    });

    job.abortController.abort();
};

const processRequest = async (message: ProcessJobRequest) => {
    const jobId = message.jobId;

    logger.info("Processing a job {jobId}: {job}", {
        jobId,
        job: message.name,
    });

    const jobHandler = jobDefinitions[message.name] as JobHandler<
        ProcessorJob
    >;

    if (!jobHandler) {
        logger.error("No handler for job: {job}", {
            job: message.name,
        });
        return;
    }

    const abortController = new AbortController();

    const job: RunningJob = {
        id: jobId,
        abortController,
        run: jobHandler,
    };

    runningJobs.set(jobId, job);

    try {
        await job.run(message.job, abortController.signal);

        if (abortController.signal.aborted) {
            logger.info("Job aborted {jobId}: {job}", {
                jobId,
                job: message.name,
            });
        } else {
            logger.info("Job processed {jobId}: {job}", {
                jobId,
                job: message.name,
            });
        }
    } catch (e: unknown) {
        logger.error("Error processing job {jobId} {job}: {error}", {
            jobId,
            job: message.name,
            error: (e as Error).message,
        });
    } finally {
        runningJobs.delete(jobId);
    }
};

export const processorService = {
    abortRequest,
    processRequest,
};
