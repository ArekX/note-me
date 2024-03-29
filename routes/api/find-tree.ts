import { Handlers } from "$fresh/server.ts";
import { findTreeRecords } from "$backend/api-handlers/tree/find-tree-records.ts";

export const handler: Handlers = {
    GET: findTreeRecords,
};
