import { Handlers } from "$fresh/server.ts";
import { getTreeRecords } from "$backend/api-handlers/tree/get-tree-records.ts";

export const handler: Handlers = {
    GET: getTreeRecords,
};
