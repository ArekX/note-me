import { axios, AxiosResponse } from "../deps.frontend.ts";
import { NoteRecord } from "../repository/note-repository.ts";

const apiInterface = axios.create({
  withCredentials: true,
  baseURL: "/api",
});

export interface CreateNoteRequest {
  text: string;
}

export const createNote = (
  note: CreateNoteRequest,
): Promise<AxiosResponse<NoteRecord>> => apiInterface.post("/add-note", note);

export interface ListNotesRequest {
  search?: string;
}

export const findNotes = (
  filter: ListNotesRequest,
): Promise<AxiosResponse<NoteRecord[]>> =>
  apiInterface.get("/find-notes", {
    params: filter,
  });
