import { Handlers } from "$fresh/server.ts";
import { handleDeleteTag } from "$backend/api-handlers/tags/delete-tag.ts";
import { handleUpdateTag } from "$backend/api-handlers/tags/update-tag.ts";

export const handler: Handlers = {
    PUT: handleUpdateTag,
    DELETE: handleDeleteTag,
};
