import { defineStore } from "pinia";
import type {
    DeleteFileMessage,
    DeleteFileResponse,
    FindFilesMessage,
    FindFilesResponse,
    GetFileDetailsMessage,
    GetFileDetailsResponse,
    UpdateFileMessage,
    UpdateFileResponse,
    UpdateMultipleFilesMessage,
    UpdateMultipleFilesResponse,
} from "@/types/messages";
import type { FindFileFilters } from "@/types/records";
import { useSocketStore } from "./socket";

// Requests of the files namespace; uploads go through useFileUploader.
export const useFilesStore = defineStore("files", () => {
    const service = () => useSocketStore().getService();

    const find = async (filters: FindFileFilters, page = 1) =>
        (
            await (
                await service()
            ).sendMessage<FindFilesMessage, FindFilesResponse>(
                "files",
                "findFiles",
                { data: { filters, page }, expect: "findFilesResponse" },
            )
        ).records;

    const remove = async (identifier: string) =>
        (await service()).sendMessage<DeleteFileMessage, DeleteFileResponse>(
            "files",
            "deleteFile",
            { data: { identifier }, expect: "deleteFileResponse" },
        );

    const setPublic = async (identifier: string, isPublic: boolean) =>
        (await service()).sendMessage<UpdateFileMessage, UpdateFileResponse>(
            "files",
            "updateFile",
            {
                data: { identifier, is_public: isPublic },
                expect: "updateFileResponse",
            },
        );

    const details = async (identifiers: string[]) =>
        (
            await (
                await service()
            ).sendMessage<GetFileDetailsMessage, GetFileDetailsResponse>(
                "files",
                "getFileDetails",
                { data: { identifiers }, expect: "getFileDetailsResponse" },
            )
        ).records;

    const setManyPublic = async (identifiers: string[], isPublic: boolean) =>
        (await service()).sendMessage<
            UpdateMultipleFilesMessage,
            UpdateMultipleFilesResponse
        >("files", "updateMultipleFiles", {
            data: { data: { identifiers, data: { is_public: isPublic } } },
            expect: "updateMultipleFilesResponse",
        });

    return { find, remove, setPublic, details, setManyPublic };
});
