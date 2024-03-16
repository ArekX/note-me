import { Handlers } from "$fresh/server.ts";
import { handleAddGroup } from "$backend/api-handlers/groups/add-group.ts";
import { handleFindGroups } from "$backend/api-handlers/groups/find-groups.ts";

export const handler: Handlers = {
    POST: handleAddGroup,
    GET: handleFindGroups,
};
