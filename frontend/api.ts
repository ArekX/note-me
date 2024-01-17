import { axiod, IAxiodResponse } from "./deps.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AddNoteRequest } from "$backend/api-handlers/notes/add-note.ts";
import { FindGroupsRequest } from "$backend/api-handlers/groups/find-groups.ts";
import { FindNotesRequest } from "$backend/api-handlers/notes/find-notes.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { getUserData } from "$frontend/user-data.ts";
import { AddGroupRequest } from "$backend/api-handlers/groups/add-group.ts";
import { UpdateGroupRequest } from "$backend/api-handlers/groups/update-group.ts";

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
