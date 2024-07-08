import { Message } from "$workers/websocket/types.ts";
import {
    FindTreeItemsFilter,
    TreeRecord,
} from "$backend/repository/tree-list.repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

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

export type FindTreeItemsMessage = TreeMessage<
    "findTreeItems",
    {
        filter: FindTreeItemsFilter;
        page: number;
    }
>;

export type FindTreeItemsResponse = TreeMessage<
    "findTreeItemsResponse",
    {
        records: Paged<TreeRecord>;
    }
>;

export type TreeFrontendResponse = GetTreeResponse | FindTreeItemsResponse;

export type TreeFrontendMessage = GetTreeMessage | FindTreeItemsMessage;
