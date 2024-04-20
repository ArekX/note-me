import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { CreateGroupMessage, CreateGroupResponse } from "./messages.ts";
import { GroupFrontendMessage } from "$workers/websocket/api/group/messages.ts";
import { createGroup } from "$backend/repository/group-repository.ts";

const createGroupRequest: ListenerFn<CreateGroupMessage> = async (
    { message, sourceClient, respond },
) => {
    // TODO: validate the request

    respond<CreateGroupResponse>({
        type: "createGroupResponse",
        record: await createGroup({
            ...message.data,
            user_id: sourceClient!.userId,
        }),
    });
};

export const frontendMap: RegisterListenerMap<GroupFrontendMessage> = {
    createGroup: createGroupRequest,
};
