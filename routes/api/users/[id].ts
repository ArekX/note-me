import { Handlers } from "$fresh/server.ts";
import { handleUpdateUser } from "$backend/api-handlers/users/update-user.ts";
import { handleDeleteUser } from "$backend/api-handlers/users/delete-user.ts";

export const handler: Handlers = {
    PUT: handleUpdateUser,
    DELETE: handleDeleteUser,
};
