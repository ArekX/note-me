import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    getTreeList,
    ItemType,
    TreeRecord,
} from "$backend/repository/tree-list.repository.ts";

type TreeListRequest<Key extends string, Request, Response> = RepositoryRequest<
    "tree-list",
    Key,
    Request,
    Response
>;

type GetTreeList = TreeListRequest<"getTreeList", {
    group_id: number | null;
    user_id: number;
    type?: ItemType;
}, TreeRecord[]>;

export type TreeListRepository = GetTreeList;

export const treeList: RepositoryHandlerMap<TreeListRepository> = {
    getTreeList: ({ group_id, user_id, type }) =>
        getTreeList(group_id, user_id, type),
};
