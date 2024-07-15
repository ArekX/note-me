import { Message } from "$workers/websocket/types.ts";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";

type TreeMessage<Type, Data = unknown> = Message<
    "tree",
    Type,
    Data
>;

export type GetTreeMessage = TreeMessage<"getTree", { parent_id?: number }>;

export type GetTreeResponse = TreeMessage<
    "getTreeResponse",
    { records: TreeRecord[]; parent_id?: number }
>;

export type TreeFrontendResponse = GetTreeResponse;

export type TreeFrontendMessage = GetTreeMessage;
