import type { BinaryMessage, Message } from "./base";
import type { FileMetaRecord, FindFileFilters, Paged } from "../records";
import type { UpdateMultipleFilesRequest } from "@/schemas/file";

type FileMessage<Type extends string, Data = unknown> = Message<
    "files",
    Type,
    Data
>;

type BinaryFileMessage<Type extends string, Data = unknown> = BinaryMessage<
    "files",
    Type,
    Data
>;

export type BeginFileMessage = FileMessage<
    "beginFile",
    { size: number; name: string; mime_type: string }
>;
export type BeginFileResponse = FileMessage<
    "beginFileResponse",
    { target_id: string }
>;

export type SendFileDataMessage = BinaryFileMessage<
    "sendFileData",
    { target_id: string }
>;
export type SendFileDataResponse = FileMessage<"sendFileDataResponse">;

export type EndFileMessage = FileMessage<"endFile", { target_id: string }>;
export type EndFileResponse = FileMessage<"endFileResponse">;

export type FindFilesMessage = FileMessage<
    "findFiles",
    { filters: FindFileFilters; page?: number }
>;
export type FindFilesResponse = FileMessage<
    "findFilesResponse",
    { records: Paged<FileMetaRecord> }
>;

export type DeleteFileMessage = FileMessage<
    "deleteFile",
    { identifier: string }
>;
export type DeleteFileResponse = FileMessage<
    "deleteFileResponse",
    { identifier: string }
>;

export interface FileUpdateData {
    identifier: string;
    is_public: boolean;
}

export type UpdateFileMessage = FileMessage<"updateFile", FileUpdateData>;
export type UpdateFileResponse = FileMessage<
    "updateFileResponse",
    { data: FileUpdateData }
>;

export type GetFileDetailsMessage = FileMessage<
    "getFileDetails",
    { identifiers: string[] }
>;
export type GetFileDetailsResponse = FileMessage<
    "getFileDetailsResponse",
    { records: FileMetaRecord[] }
>;

export type UpdateMultipleFilesMessage = FileMessage<
    "updateMultipleFiles",
    { data: UpdateMultipleFilesRequest }
>;
export type UpdateMultipleFilesResponse = FileMessage<
    "updateMultipleFilesResponse",
    { data: UpdateMultipleFilesRequest }
>;

export type FileFrontendMessage =
    | BeginFileMessage
    | SendFileDataMessage
    | EndFileMessage
    | FindFilesMessage
    | DeleteFileMessage
    | UpdateFileMessage
    | GetFileDetailsMessage
    | UpdateMultipleFilesMessage;

export type FileFrontendResponse =
    | BeginFileResponse
    | SendFileDataResponse
    | EndFileResponse
    | FindFilesResponse
    | DeleteFileResponse
    | UpdateFileResponse
    | GetFileDetailsResponse
    | UpdateMultipleFilesResponse;
