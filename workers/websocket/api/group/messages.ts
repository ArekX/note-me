import { Message } from "$workers/websocket/types.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { AddGroupRequest, UpdateGroupRequest } from "$schemas/groups.ts";

type GroupMessage<Type, Data = unknown> = Message<
    "groups",
    Type,
    Data
>;

export type CreateGroupMessage = GroupMessage<
    "createGroup",
    { data: AddGroupRequest }
>;

export type CreateGroupResponse = GroupMessage<
    "createGroupResponse",
    { record: GroupRecord }
>;

export type UpdateGroupMessage = GroupMessage<
    "updateGroup",
    { id: number; data: UpdateGroupRequest }
>;

export type UpdateGroupResponse = GroupMessage<
    "updateGroupResponse",
    { updatedId: number; updatedData: UpdateGroupRequest }
>;

export type DeleteGroupMessage = GroupMessage<
    "deleteGroup",
    { id: number }
>;

export type DeleteGroupResponse = GroupMessage<
    "deleteGroupResponse",
    { deletedId: number }
>;

export type GroupFrontendResponse =
    | CreateGroupResponse
    | UpdateGroupResponse
    | DeleteGroupResponse;

export type GroupFrontendMessage =
    | CreateGroupMessage
    | UpdateGroupMessage
    | DeleteGroupMessage;
