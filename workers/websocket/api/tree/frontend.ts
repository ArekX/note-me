import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    FindTreeItemsMessage,
    FindTreeItemsResponse,
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendMessage,
} from "./messages.ts";
import {
    findTreeItems,
    getTreeList,
} from "$backend/repository/tree-list.repository.ts";

const getTree: ListenerFn<GetTreeMessage> = async (
    { message, sourceClient, respond },
) => {
    respond<GetTreeResponse>({
        type: "getTreeResponse",
        parent_id: message.parent_id,
        records: await getTreeList(
            message.parent_id ?? null,
            sourceClient!.userId,
        ),
    });
};

const handleFindTreeItems: ListenerFn<FindTreeItemsMessage> = async (
    { message, sourceClient, respond },
) => {
    const records = await findTreeItems(
        message.filter,
        message.page,
        sourceClient!.userId,
    );

    respond<FindTreeItemsResponse>({
        type: "findTreeItemsResponse",
        records,
    });
};

export const frontendMap: RegisterListenerMap<TreeFrontendMessage> = {
    getTree,
    findTreeItems: handleFindTreeItems,
};
