import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendMessage,
} from "./messages.ts";
import { repository } from "$db";

const handleGetTree: ListenerFn<GetTreeMessage> = async (
    { message, sourceClient, respond },
) => {
    respond<GetTreeResponse>({
        type: "getTreeResponse",
        parent_id: message.parent_id,
        records: await repository.treeList.getTreeList({
            group_id: message.parent_id ?? null,
            user_id: sourceClient!.userId,
            type: message.item_type,
        }),
    });
};

export const frontendMap: RegisterListenerMap<TreeFrontendMessage> = {
    getTree: handleGetTree,
};
