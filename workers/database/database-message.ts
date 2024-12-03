import {
    getConnectedWorkerName,
    workerSendMesage,
} from "$workers/services/worker-bus.ts";
import { RepositoryRequest } from "$workers/database/message.ts";

export const requestFromDb = <T extends RepositoryRequest>(
    ...params: Parameters<typeof createDbMesage<T>>
) => {
    workerSendMesage(
        "database",
        createDbMesage<T>(...params),
    );
};
export const createDbMesage = <T extends RepositoryRequest>(
    name: T["name"],
) => ({
    requestId: crypto.randomUUID(),
    from: getConnectedWorkerName(),
    name,
});
