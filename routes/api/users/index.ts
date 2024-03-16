import { Handlers } from "$fresh/server.ts";
import { handleFindUsers } from "$backend/api-handlers/users/find-users.ts";

export const handler: Handlers = {
    GET: handleFindUsers,
};
