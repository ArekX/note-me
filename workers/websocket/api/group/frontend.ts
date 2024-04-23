import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    DeleteGroupResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "./messages.ts";
import { GroupFrontendMessage } from "$workers/websocket/api/group/messages.ts";
import {
    createGroup,
    deleteGroup,
    updateGroup,
} from "$backend/repository/group-repository.ts";

const createGroupRequest: ListenerFn<CreateGroupMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    // TODO: validate the request

    respond<CreateGroupResponse>({
        type: "createGroupResponse",
        record: await createGroup({
            ...data,
            user_id: sourceClient!.userId,
        }),
    });
};

const updateGroupRequest: ListenerFn<UpdateGroupMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    // TODO: validate the request

    await updateGroup(sourceClient!.userId, {
        ...data,
        id,
    });

    respond<UpdateGroupResponse>({
        type: "updateGroupResponse",
        updatedId: id,
        updatedData: data,
    });
};

const deleteGroupRequest: ListenerFn<DeleteGroupMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    // TODO: validate the request

    await deleteGroup(id, sourceClient!.userId);

    respond<DeleteGroupResponse>({
        type: "deleteGroupResponse",
        deletedId: id,
    });
};

export const frontendMap: RegisterListenerMap<GroupFrontendMessage> = {
    createGroup: createGroupRequest,
    updateGroup: updateGroupRequest,
    deleteGroup: deleteGroupRequest,
};
