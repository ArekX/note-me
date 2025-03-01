import { BinaryMessage, Message } from "$workers/websocket/types.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { FileMetaRecord, FindFileFilters } from "$db";
import { UpdateMultipleFilesRequest } from "$schemas/file.ts";

type FileMessage<Type, Data = unknown> = Message<
    "files",
    Type,
    Data
>;

type BinaryFileMessage<Type, Data = unknown> = BinaryMessage<
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

export type SendFileDataResponse = FileMessage<
    "sendFileDataResponse"
>;

export type EndFileMessage = FileMessage<
    "endFile",
    { target_id: string }
>;

export type EndFileResponse = FileMessage<
    "endFileResponse"
>;

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

export type UpdateData = { identifier: string; is_public: boolean };

export type UpdateFileMessage = FileMessage<
    "updateFile",
    UpdateData
>;

export type UpdateFileResponse = FileMessage<
    "updateFileResponse",
    { data: UpdateData }
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

export type FileFrontendResponse =
    | BeginFileResponse
    | SendFileDataResponse
    | EndFileResponse
    | FindFilesResponse
    | DeleteFileResponse
    | UpdateFileResponse
    | GetFileDetailsResponse
    | UpdateMultipleFilesResponse;

export type FileFrontendMessage =
    | BeginFileMessage
    | SendFileDataMessage
    | EndFileMessage
    | FindFilesMessage
    | DeleteFileMessage
    | UpdateFileMessage
    | GetFileDetailsMessage
    | UpdateMultipleFilesMessage;
