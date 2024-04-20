import { Message } from "$workers/websocket/types.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { AddGroupRequest } from "$schemas/groups.ts";

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

export type GroupFrontendResponse = CreateGroupResponse;

export type GroupFrontendMessage = CreateGroupMessage;
