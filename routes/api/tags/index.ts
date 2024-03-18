import { Handlers } from "$fresh/server.ts";
import { handleFindTags } from "$backend/api-handlers/tags/find-tags.ts";
import { handleAddTag } from "$backend/api-handlers/tags/add-tag.ts";

export const handler: Handlers = {
    GET: handleFindTags,
    POST: handleAddTag,
};
