import { axiod, IAxiodResponse } from "./deps.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AddNoteRequest } from "../routes/api/add-note.ts";

const apiInterface = axiod.create({
  withCredentials: true,
  baseURL: "/api",
});

export const createNote = (
  note: AddNoteRequest,
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
