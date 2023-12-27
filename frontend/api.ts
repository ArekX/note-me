import { axiod, IAxiodResponse } from "./deps.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";

const apiInterface = axiod.create({
  withCredentials: true,
  baseURL: "/api",
});

export interface CreateNoteRequest {
  group_id: number | null;
  tags: string[];
  text: string;
}

export const createNote = (
  note: CreateNoteRequest,
): Promise<IAxiodResponse<NoteRecord>> => apiInterface.post("/add-note", note);

export interface ListNotesRequest {
  search?: string;
}

export const findNotes = (
  filter: ListNotesRequest,
): Promise<IAxiodResponse<NoteRecord[]>> =>
  apiInterface.get("/find-notes", {
    params: filter as {
      [key: string]: string | number | boolean;
    } | undefined,
  });
