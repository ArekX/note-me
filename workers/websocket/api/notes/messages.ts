import { Message } from "$workers/websocket/types.ts";
import { AddNoteRequest, UpdateNoteRequest } from "$schemas/notes.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";

type NoteMessage<Type, Data = unknown> = Message<
    "notes",
    Type,
    Data
>;

export type CreateNoteMessage = NoteMessage<
    "createNote",
    { data: AddNoteRequest }
>;

export type CreateNoteResponse = NoteMessage<
    "createNoteResponse",
    { record: NoteRecord; group_id: number | null }
>;

export type UpdateNoteMessage = NoteMessage<
    "updateNote",
    { id: number; data: UpdateNoteRequest }
>;

export type UpdateNoteResponse = NoteMessage<
    "updateNoteResponse",
    { updatedId: number; updatedData: UpdateNoteRequest }
>;

export type DeleteNoteMessage = NoteMessage<
    "deleteNote",
    { id: number }
>;

export type DeleteNoteResponse = NoteMessage<
    "deleteNoteResponse",
    { deletedId: number }
>;

export type NoteFrontendResponse =
    | CreateNoteResponse
    | UpdateNoteResponse
    | DeleteNoteResponse;

export type NoteFrontendMessage =
    | CreateNoteMessage
    | UpdateNoteMessage
    | DeleteNoteMessage;
