import { axiod, IAxiodResponse } from "../deps.frontend.ts";
import { NoteRecord } from "../repository/note-repository.ts";

const apiInterface = axiod.create({
  withCredentials: true,
  baseURL: "/api",
});

export interface CreateNoteRequest {
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
