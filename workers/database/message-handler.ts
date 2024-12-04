import { DatabaseMessageKey, DatabaseResponse, DbRequest } from "./request.ts";
import { ServiceName, workerSendMesage } from "$workers/services/worker-bus.ts";
import { backupTarget } from "$workers/database/repository/backup-target.ts";

const repositories = {
    backupTarget,
};

const respondFromDb = <T>(fromRequest: DbRequest, response: T) => {
    workerSendMesage<DatabaseResponse, DatabaseMessageKey>(
        fromRequest.from as ServiceName,
        "databaseResponse",
        {
            forRequestId: fromRequest.requestId,
            data: response,
        },
    );
};

export const handleMesage = async (request: DbRequest) => {
    if (!(request.data.name in repositories)) {
        return;
    }

    const repo = repositories[request.data.name];

    if (!(request.data.key in repo)) {
        throw new Error(
            `Key ${request.data.key} not found in repository ${request.data.name}`,
        );
    }

    // TODO: Add try catch block and respond with error message
    const response = await repo[request.data.key](request.data.data as never);

    respondFromDb(request, response);
};
