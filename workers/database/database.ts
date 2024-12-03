import { DbRequest } from "$workers/database/message.ts";
import {
    DatabaseMessageKey,
    DatabaseResponse,
} from "$workers/database/database-message.ts";
import { ServiceName, workerSendMesage } from "$workers/services/worker-bus.ts";
import { getUserById } from "$backend/repository/user-repository.ts";

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
    // Handle the request
    console.log("request", request);

    const r = await getUserById(+request.data.data.id);

    // Respond to the request
    respondFromDb(request, r);
    return { success: true };
};
