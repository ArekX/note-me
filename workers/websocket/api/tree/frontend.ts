import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendMessage,
} from "./messages.ts";
import { getTreeList } from "$backend/repository/tree-list.repository.ts";

const handleGetTree: ListenerFn<GetTreeMessage> = async (
    { message, sourceClient, respond },
) => {
    respond<GetTreeResponse>({
        type: "getTreeResponse",
        parent_id: message.parent_id,
        records: await getTreeList(
            message.parent_id ?? null,
            sourceClient!.userId,
            message.item_type,
        ),
    });
};

export const frontendMap: RegisterListenerMap<TreeFrontendMessage> = {
    getTree: handleGetTree,
};
