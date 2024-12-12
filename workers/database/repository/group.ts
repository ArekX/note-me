import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    assignNoteToGroup,
    createGroup,
    deleteGroup,
    deleteUserGroupsByParentId,
    getGroupById,
    getSingleUserGroup,
    getUserGroupIds,
    getUserGroups,
    groupExists,
    GroupRecord,
    NewGroupRecord,
    updateGroup,
    UpdateGroupRecord,
} from "../query/group-repository.ts";

type UserRequest<Key extends string, Request, Response> = DbRequest<
    "group",
    "repository",
    Key,
    Request,
    Response
>;

type GetUserGroups = UserRequest<
    "getUserGroups",
    { parent_id: number | string | null; user_id: number },
    GroupRecord[]
>;
type GroupExists = UserRequest<
    "groupExists",
    { id: number; user_id: number },
    boolean
>;
type AssignNoteToGroup = UserRequest<
    "assignNoteToGroup",
    { group_id: number | null; note_id: number; user_id: number },
    void
>;
type CreateGroup = UserRequest<"createGroup", NewGroupRecord, GroupRecord>;
type UpdateGroup = UserRequest<
    "updateGroup",
    { user_id: number; record: UpdateGroupRecord },
    boolean
>;
type DeleteGroup = UserRequest<
    "deleteGroup",
    { id: number; user_id: number },
    boolean
>;
type GetSingleUserGroup = UserRequest<
    "getSingleUserGroup",
    { id: number; user_id: number },
    GroupRecord | null
>;
type GetUserGroupIds = UserRequest<
    "getUserGroupIds",
    { id: number; user_id: number },
    number[]
>;
type DeleteUserGroupsByParentId = UserRequest<
    "deleteUserGroupsByParentId",
    { parent_id: number; user_id: number },
    number
>;
type GetGroupById = UserRequest<
    "getGroupById",
    { id: number; user_id: number },
    GroupRecord | null
>;

export type GroupRepository =
    | GetUserGroups
    | GroupExists
    | AssignNoteToGroup
    | CreateGroup
    | UpdateGroup
    | DeleteGroup
    | GetSingleUserGroup
    | GetUserGroupIds
    | DeleteUserGroupsByParentId
    | GetGroupById;

export const group: DbHandlerMap<GroupRepository> = {
    getUserGroups: ({ parent_id, user_id }) =>
        getUserGroups(parent_id, user_id),
    groupExists: ({ id, user_id }) => groupExists(id, user_id),
    assignNoteToGroup: ({ group_id, note_id, user_id }) =>
        assignNoteToGroup(group_id, note_id, user_id),
    createGroup,
    updateGroup: ({ user_id, record }) => updateGroup(user_id, record),
    deleteGroup: ({ id, user_id }) => deleteGroup(id, user_id),
    getSingleUserGroup: ({ id, user_id }) => getSingleUserGroup(id, user_id),
    getUserGroupIds: ({ id, user_id }) => getUserGroupIds(id, user_id),
    deleteUserGroupsByParentId: ({ parent_id, user_id }) =>
        deleteUserGroupsByParentId(parent_id, user_id),
    getGroupById: ({ id, user_id }) => getGroupById(id, user_id),
};
