import { defineStore } from "pinia";
import type {
    CreateNoteMessage,
    CreateNoteResponse,
    DeleteNoteMessage,
    DeleteNoteResponse,
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
    GetNoteMessage,
    GetNoteResponse,
    GetRecentlyOpenedNotesMessage,
    GetRecentlyOpenedNotesResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "@/types/messages";
import type { NoteDetailsOptions } from "@/types/records";
import type { AddNoteRequest, UpdateNoteRequest } from "@/schemas/notes";
import { useSocketStore } from "./socket";

export const useNotesStore = defineStore("notes", () => {
    const service = () => useSocketStore().getService();

    const getNote = async (id: number, markOpened = false) =>
        (
            await (
                await service()
            ).sendMessage<GetNoteMessage, GetNoteResponse>("notes", "getNote", {
                data: markOpened ? { id, mark_opened: true } : { id },
                expect: "getNoteResponse",
            })
        ).record;

    const getDetails = async (id: number, options: NoteDetailsOptions) =>
        (
            await (
                await service()
            ).sendMessage<GetNoteDetailsMessage, GetNoteDetailsResponse>(
                "notes",
                "getNoteDetails",
                {
                    data: { id, options },
                    expect: "getNoteDetailsResponse",
                },
            )
        ).record;

    const createNote = async (data: AddNoteRequest) =>
        (await service()).sendMessage<CreateNoteMessage, CreateNoteResponse>(
            "notes",
            "createNote",
            { data: { data }, expect: "createNoteResponse" },
        );

    const updateNote = async (id: number, data: UpdateNoteRequest) =>
        (await service()).sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
            "notes",
            "updateNote",
            { data: { id, data }, expect: "updateNoteResponse" },
        );

    const deleteNote = async (id: number) =>
        (await service()).sendMessage<DeleteNoteMessage, DeleteNoteResponse>(
            "notes",
            "deleteNote",
            { data: { id }, expect: "deleteNoteResponse" },
        );

    const getRecentlyOpened = async () =>
        (
            await (
                await service()
            ).sendMessage<
                GetRecentlyOpenedNotesMessage,
                GetRecentlyOpenedNotesResponse
            >("notes", "getRecentlyOpenedNotes", {
                expect: "getRecentlyOpenedNotesResponse",
            })
        ).records;

    return {
        getNote,
        getDetails,
        createNote,
        updateNote,
        deleteNote,
        getRecentlyOpened,
    };
});
