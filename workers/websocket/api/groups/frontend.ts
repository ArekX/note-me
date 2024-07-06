import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    DeleteGroupProgress,
    DeleteGroupResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "./messages.ts";
import { GroupFrontendMessage } from "./messages.ts";
import {
    createGroup,
    deleteGroup,
    deleteUserGroupsByParentId,
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

const createGroupRequest: ListenerFn<CreateGroupMessage> = async (
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

const updateGroupRequest: ListenerFn<UpdateGroupMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    await requireValidSchema(updateGroupRequestSchema, data);

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

const deleteGroupRequest: ListenerFn<DeleteGroupMessage> = async (
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

export const frontendMap: RegisterListenerMap<GroupFrontendMessage> = {
    createGroup: createGroupRequest,
    updateGroup: updateGroupRequest,
    deleteGroup: deleteGroupRequest,
};
