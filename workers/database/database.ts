import { RepositoryRequest } from "$workers/database/message.ts";

export const handleMesage = (request: RepositoryRequest) => {
    // Handle the request
    console.log("request", request);

    return { success: true };
};
