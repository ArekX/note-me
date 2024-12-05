import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    createFileRecord,
    deleteFileByUser,
    deleteFileRecord,
    fileExistsForUser,
    FileMetaRecord,
    FileWithData,
    FindFileFilters,
    findFiles,
    getFileData,
    getFileDetailsForUser,
    getFileRecordSize,
    getUserFileCount,
    NewFileRecord,
    setFileRecordData,
    updateFileRecord,
    updateMultipleFiles,
    UpdateMultipleFilesData,
} from "$backend/repository/file-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

type FileRequest<Key extends string, Request, Response> = RepositoryRequest<
    "file",
    Key,
    Request,
    Response
>;

type CreateFileRecord = FileRequest<"createFileRecord", NewFileRecord, void>;
type SetFileRecordData = FileRequest<
    "setFileRecordData",
    { identifier: string; data: Uint8Array },
    void
>;
type FileExistsForUser = FileRequest<
    "fileExistsForUser",
    { identifier: string; user_id: number },
    boolean
>;
type GetFileRecordSize = FileRequest<
    "getFileRecordSize",
    string,
    number | null
>;
type DeleteFileRecord = FileRequest<"deleteFileRecord", string, boolean>;
type FindFiles = FileRequest<
    "findFiles",
    { filters: FindFileFilters; user_id: number; page: number },
    Paged<FileMetaRecord>
>;
type DeleteFileByUser = FileRequest<
    "deleteFileByUser",
    { identifier: string; user_id: number },
    boolean
>;
type GetFileData = FileRequest<"getFileData", string, FileWithData | null>;
type UpdateFileRecord = FileRequest<
    "updateFileRecord",
    { identifier: string; is_public: boolean; scope_by_user_id: number | null },
    boolean
>;
type GetFileDetailsForUser = FileRequest<
    "getFileDetailsForUser",
    { identifiers: string[]; user_id: number },
    FileMetaRecord[]
>;
type UpdateMultipleFiles = FileRequest<
    "updateMultipleFiles",
    { user_id: number; identifiers: string[]; data: UpdateMultipleFilesData },
    void
>;
type GetUserFileCount = FileRequest<"getUserFileCount", number, number>;

export type FileRepository =
    | CreateFileRecord
    | SetFileRecordData
    | FileExistsForUser
    | GetFileRecordSize
    | DeleteFileRecord
    | FindFiles
    | DeleteFileByUser
    | GetFileData
    | UpdateFileRecord
    | GetFileDetailsForUser
    | UpdateMultipleFiles
    | GetUserFileCount;

// TODO: make sure uint8array will be serialized correctly
export const file: RepositoryHandlerMap<FileRepository> = {
    createFileRecord,
    setFileRecordData: ({ identifier, data }) =>
        setFileRecordData(identifier, data),
    fileExistsForUser: ({ identifier, user_id }) =>
        fileExistsForUser(identifier, user_id),
    getFileRecordSize,
    deleteFileRecord,
    findFiles: ({ filters, user_id, page }) =>
        findFiles(filters, user_id, page),
    deleteFileByUser: ({ identifier, user_id }) =>
        deleteFileByUser(identifier, user_id),
    getFileData,
    updateFileRecord: ({ identifier, is_public, scope_by_user_id }) =>
        updateFileRecord(identifier, is_public, scope_by_user_id),
    getFileDetailsForUser: ({ identifiers, user_id }) =>
        getFileDetailsForUser(identifiers, user_id),
    updateMultipleFiles: ({ user_id, identifiers, data }) =>
        updateMultipleFiles(user_id, identifiers, data),
    getUserFileCount,
};
