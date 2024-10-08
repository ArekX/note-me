import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    DeleteGroupProgress,
    DeleteGroupResponse,
    GetSingleGroupMessage,
    GetSingleGroupResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "./messages.ts";
import { GroupFrontendMessage } from "./messages.ts";
import {
    createGroup,
    deleteGroup,
    deleteUserGroupsByParentId,
    getGroupById,
    getUserGroupIds,
    updateGroup,
} from "$backend/repository/group-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addGroupRequestSchema,
    updateGroupRequestSchema,
} from "$schemas/groups.ts";
import {
    deleteUserNotesByParentId,
    getUserNoteIds,
} from "$backend/repository/note-repository.ts";
import { DeleteNoteResponse } from "$workers/websocket/api/notes/messages.ts";

const handleCreateGroupRequest: ListenerFn<CreateGroupMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(addGroupRequestSchema, data);

    respond<CreateGroupResponse>({
        type: "createGroupResponse",
        record: await createGroup({
            ...data,
            user_id: sourceClient!.userId,
        }),
    });
};

const handleUpdateGroupRequest: ListenerFn<UpdateGroupMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    await requireValidSchema(updateGroupRequestSchema, data);

    if (data.parent_id === id) {
        throw new Error("Group cannot be its own parent");
    }

    await updateGroup(sourceClient!.userId, {
        ...data,
        id,
    });

    respond<UpdateGroupResponse>({
        type: "updateGroupResponse",
        updated_id: id,
        updated_data: data,
    });
};

const handleDeleteGroupRequest: ListenerFn<DeleteGroupMessage> = async (
    { message: { id }, sourceClient, respond, send },
) => {
    let deletedCount = 0;

    const deleteChildren = async (parentId: number) => {
        const childGroupIds = await getUserGroupIds(
            parentId,
            sourceClient!.userId,
        );

        const userNoteIds = await getUserNoteIds(
            parentId,
            sourceClient!.userId,
        );

        const [groupCount, noteCount] = await Promise.all([
            deleteUserGroupsByParentId(
                parentId,
                sourceClient!.userId,
            ),
            deleteUserNotesByParentId(
                parentId,
                sourceClient!.userId,
            ),
        ]);

        for (const noteId of userNoteIds) {
            send<DeleteNoteResponse>({
                namespace: "notes",
                type: "deleteNoteResponse",
                deleted_id: noteId,
            });
        }

        for (const groupId of childGroupIds) {
            send<DeleteGroupResponse>({
                type: "deleteGroupResponse",
                deleted_id: groupId,
            });
        }

        deletedCount += groupCount + noteCount;

        send<DeleteGroupProgress>({
            type: "deleteGroupProgress",
            deleted_id: id,
            deleted_count: deletedCount,
        });

        for (const id of childGroupIds) {
            await deleteChildren(id);
        }
    };

    await deleteChildren(id);
    await deleteGroup(id, sourceClient!.userId);

    respond<DeleteGroupResponse>({
        type: "deleteGroupResponse",
        deleted_id: id,
    });
};

const handleGetSingleGroup: ListenerFn<GetSingleGroupMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    respond<GetSingleGroupResponse>({
        type: "getSingleGroupResponse",
        record: await getGroupById(id, sourceClient!.userId),
    });
};

export const frontendMap: RegisterListenerMap<GroupFrontendMessage> = {
    createGroup: handleCreateGroupRequest,
    updateGroup: handleUpdateGroupRequest,
    deleteGroup: handleDeleteGroupRequest,
    getSingleGroup: handleGetSingleGroup,
};
