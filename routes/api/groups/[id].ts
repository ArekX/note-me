import { Handlers } from "$fresh/server.ts";
import { handleUpdateGroup } from "$backend/api-handlers/groups/update-group.ts";
import { handleDeleteGroup } from "$backend/api-handlers/groups/delete-group.ts";

export const handler: Handlers = {
    PUT: handleUpdateGroup,
    DELETE: handleDeleteGroup,
};
