import { Message } from "$workers/websocket/types.ts";
import { GroupRecord } from "$db";
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
    { updated_id: number; updated_data: UpdateGroupRequest }
>;

export type DeleteGroupMessage = GroupMessage<
    "deleteGroup",
    { id: number }
>;

export type DeleteGroupResponse = GroupMessage<
    "deleteGroupResponse",
    { deleted_id: number }
>;

export type DeleteGroupProgress = GroupMessage<
    "deleteGroupProgress",
    { deleted_id: number; deleted_count: number }
>;

export type GetSingleGroupMessage = GroupMessage<
    "getSingleGroup",
    { id: number }
>;

export type GetSingleGroupResponse = GroupMessage<
    "getSingleGroupResponse",
    { record: GroupRecord | null }
>;

export type GroupFrontendResponse =
    | CreateGroupResponse
    | UpdateGroupResponse
    | DeleteGroupResponse
    | DeleteGroupProgress
    | GetSingleGroupResponse;

export type GroupFrontendMessage =
    | CreateGroupMessage
    | UpdateGroupMessage
    | DeleteGroupMessage
    | GetSingleGroupMessage;
