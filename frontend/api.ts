import { axiod, IAxiodResponse } from "./deps.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AddNoteRequest } from "../routes/api/add-note.ts";
import { FindGroupsRequest } from "../routes/api/find-groups.ts";
import { FindNotesRequest } from "../routes/api/find-notes.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { getUserData } from "$frontend/user-data.ts";
import { AddGroupRequest } from "../routes/api/add-group.ts";
import { UpdateGroupRequest } from "../routes/api/update-group.ts";

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
  apiInterface.post("/add-note", {
    ...note,
  }, {
    params: {
      csrf: getUserData().csrfToken,
    },
  });

export const createGroup = (
  group: AddGroupRequest,
): Promise<IAxiodResponse<GroupRecord>> =>
  apiInterface.post("/add-group", {
    ...group,
  }, {
    params: {
      csrf: getUserData().csrfToken,
    },
  });

export const updateGroup = (
  group: UpdateGroupRequest,
): Promise<IAxiodResponse<{ success: boolean }>> =>
  apiInterface.post("/update-group", {
    ...group,
  }, {
    params: {
      csrf: getUserData().csrfToken,
    },
  });

export const findNotes = (
  filter: FindNotesRequest,
): Promise<IAxiodResponse<NoteRecord[]>> =>
  apiInterface.get("/find-notes", {
    params: filter as QueryParams,
  });

export const findGroups = (
  filter?: FindGroupsRequest,
): Promise<IAxiodResponse<GroupRecord[]>> =>
  apiInterface.get("/find-groups", {
    params: filter as QueryParams,
  });
