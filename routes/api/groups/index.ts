import { Handlers } from "$fresh/server.ts";
import { handleAddGroup } from "$backend/api-handlers/groups/add-group.ts";

export const handler: Handlers = {
    POST: handleAddGroup,
};
