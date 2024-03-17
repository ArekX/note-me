import { Handlers } from "$fresh/server.ts";
import { handleFindUsers } from "$backend/api-handlers/users/find-users.ts";
import { handleAddUser } from "$backend/api-handlers/users/add-user.ts";

export const handler: Handlers = {
    GET: handleFindUsers,
    POST: handleAddUser,
};
