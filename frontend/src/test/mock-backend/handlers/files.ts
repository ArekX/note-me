import type {
    BeginFileResponse,
    DeleteFileResponse,
    EndFileResponse,
    FileFrontendMessage,
    FindFilesResponse,
    GetFileDetailsResponse,
    SendFileDataResponse,
    UpdateFileResponse,
    UpdateMultipleFilesResponse,
} from "@/types/messages";
import { fileKind } from "@/lib/file-kind";
import { contains, nextId, paged, type MockHandlerMap } from "../handler";
import { now } from "../state";

const MOCK_MAX_FILE_SIZE = 52_428_800;

export const filesHandlers: MockHandlerMap<FileFrontendMessage> = {
    beginFile: ({ name, size, mime_type }, { state, respond, fail }) => {
        if (size > MOCK_MAX_FILE_SIZE) {
            return fail("File size is over the allowable limit.");
        }
        const target_id = `mock-upload-${nextId(state)}`;
        state.uploads.set(target_id, {
            name: name.replace(/[^a-zA-Z0-9_ .-]+/g, "-"),
            mime_type,
            size,
            chunks: [],
        });
        respond<BeginFileResponse>("beginFileResponse", { target_id });
    },
    sendFileData: ({ target_id, binaryData }, { state, respond, fail }) => {
        const upload = state.uploads.get(target_id);
        if (!upload) {
            return fail("File not found.");
        }
        upload.chunks.push(new Uint8Array(binaryData ?? []));
        respond<SendFileDataResponse>("sendFileDataResponse");
    },
    endFile: ({ target_id }, { state, respond, fail }) => {
        const upload = state.uploads.get(target_id);
        if (!upload) {
            return fail("File not found.");
        }
        state.uploads.delete(target_id);
        const data = new Blob(upload.chunks as BlobPart[], {
            type: upload.mime_type,
        });
        if (data.size !== upload.size) {
            return fail("File size mismatch.");
        }
        state.files.unshift({
            identifier: target_id,
            name: upload.name,
            mime_type: upload.mime_type,
            size: upload.size,
            is_public: false,
            created_at: now(),
            created_by: state.currentUser.name,
        });
        respond<EndFileResponse>("endFileResponse");
    },
    findFiles: ({ filters, page }, { state, respond }) =>
        respond<FindFilesResponse>("findFilesResponse", {
            records: paged(
                state.files.filter(
                    (f) =>
                        contains(f.name, filters.name) &&
                        (filters.allFiles ||
                            f.created_by === state.currentUser.name) &&
                        (!filters.allFiles ||
                            contains(f.created_by, filters.owner)) &&
                        (!filters.kind ||
                            fileKind(f.mime_type) === filters.kind) &&
                        (!filters.visibility ||
                            f.is_public === (filters.visibility === "public")),
                ),
                page ?? 1,
            ),
        }),
    deleteFile: ({ identifier }, { state, respond }) => {
        state.files = state.files.filter((f) => f.identifier !== identifier);
        respond<DeleteFileResponse>("deleteFileResponse", { identifier });
    },
    updateFile: ({ identifier, is_public }, { state, respond }) => {
        const file = state.files.find((f) => f.identifier === identifier);
        if (file) {
            file.is_public = is_public;
        }
        respond<UpdateFileResponse>("updateFileResponse", {
            data: { identifier, is_public },
        });
    },
    getFileDetails: ({ identifiers }, { state, respond }) =>
        respond<GetFileDetailsResponse>("getFileDetailsResponse", {
            records: state.files.filter((f) =>
                identifiers.includes(f.identifier),
            ),
        }),
    updateMultipleFiles: ({ data }, { state, respond }) => {
        for (const file of state.files.filter((f) =>
            data.identifiers.includes(f.identifier),
        )) {
            if (data.data.is_public !== undefined) {
                file.is_public = data.data.is_public;
            }
        }
        respond<UpdateMultipleFilesResponse>("updateMultipleFilesResponse", {
            data,
        });
    },
};
