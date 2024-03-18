import { axiod, IAxiodResponse } from "./deps.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { FindGroupsRequest } from "$backend/api-handlers/groups/find-groups.ts";
import { FindNotesRequest } from "$backend/api-handlers/notes/find-notes.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { getUserData } from "$frontend/user-data.ts";
import { AddNoteRequest } from "$schemas/notes.ts";
import { AddGroupRequest, UpdateGroupRequest } from "$schemas/groups.ts";
import { UserProfile } from "$schemas/users.ts";
import { FindTagRequest } from "$backend/api-handlers/tags/find-tags.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { UserRecord } from "$backend/repository/user-repository.ts";
import { TagRecord } from "$backend/repository/note-tags-repository.ts";
import { AddUserRequest } from "$schemas/users.ts";
import { UpdateUserRequest } from "$schemas/users.ts";
import { AddTagRequest, UpdateTagRequest } from "$schemas/tags.ts";
import { FindUserRequest } from "$backend/api-handlers/users/find-users.ts";

const apiInterface = axiod.create({
    withCredentials: true,
    baseURL: "/api",
});

type QueryParams = {
    [key: string]: string | number | boolean;
} | undefined;

export const createNote = (
    note: AddNoteRequest,
): Promise<IAxiodResponse<NoteRecord>> =>
    apiInterface.post("/notes", {
        ...note,
    }, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const findNotes = (
    filter: FindNotesRequest,
): Promise<IAxiodResponse<NoteRecord[]>> =>
    apiInterface.get("/notes", {
        params: filter as QueryParams,
    });

export const createGroup = (
    group: AddGroupRequest,
): Promise<IAxiodResponse<GroupRecord>> =>
    apiInterface.post("/groups", {
        ...group,
    }, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const updateGroup = (
    id: number,
    group: UpdateGroupRequest,
): Promise<IAxiodResponse<{ success: boolean }>> =>
    apiInterface.put(`/groups/${id}`, {
        ...group,
    }, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const findGroups = (
    filter?: FindGroupsRequest,
): Promise<IAxiodResponse<GroupRecord[]>> =>
    apiInterface.get("/groups", {
        params: filter as QueryParams,
    });

export const deleteGroup = (
    id: number,
): Promise<IAxiodResponse<GroupRecord[]>> =>
    apiInterface.delete(`/groups/${id}`, {}, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const updateProfile = (
    profile: UserProfile,
): Promise<IAxiodResponse<{ success: boolean }>> =>
    apiInterface.put(`/profile`, {
        ...profile,
    }, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const findUsers = (
    request?: FindUserRequest,
): Promise<IAxiodResponse<Paged<UserRecord>>> =>
    apiInterface.get(`/users`, {
        params: request as QueryParams,
    });

export const createUser = (
    data: AddUserRequest,
): Promise<IAxiodResponse<UserRecord>> =>
    apiInterface.post(`/users`, data, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const updateUser = (
    id: number,
    data: UpdateUserRequest,
): Promise<IAxiodResponse<UserRecord>> =>
    apiInterface.put(`/users/${id}`, data, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const deleteUser = (
    id: number,
): Promise<IAxiodResponse<boolean>> =>
    apiInterface.delete(`/users/${id}`, {}, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const findTags = (
    request?: FindTagRequest,
): Promise<IAxiodResponse<Paged<TagRecord>>> =>
    apiInterface.get(`/tags`, {
        params: request as QueryParams,
    });

export const createTag = (
    data: AddTagRequest,
): Promise<IAxiodResponse<TagRecord>> =>
    apiInterface.post(`/tags`, data, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const updateTag = (
    id: number,
    data: UpdateTagRequest,
): Promise<IAxiodResponse<UserRecord>> =>
    apiInterface.put(`/tags/${id}`, data, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });

export const deleteTag = (
    id: number,
): Promise<IAxiodResponse<boolean>> =>
    apiInterface.delete(`/tags/${id}`, {}, {
        params: {
            csrf: getUserData().csrfToken,
        },
    });
