import type { Message } from "./base";
import type { ItemType, TreeRecord } from "../records";

type TreeMessage<Type extends string, Data = unknown> = Message<
    "tree",
    Type,
    Data
>;

export type GetTreeMessage = TreeMessage<
    "getTree",
    { parent_id?: number; item_type?: ItemType }
>;

export type GetTreeResponse = TreeMessage<
    "getTreeResponse",
    { records: TreeRecord[]; parent_id?: number }
>;

export type TreeFrontendMessage = GetTreeMessage;
export type TreeFrontendResponse = GetTreeResponse;
