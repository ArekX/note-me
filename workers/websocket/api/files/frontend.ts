import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    appendToTempFile,
    createTempFile,
    getTempFileSize,
    readTempFile,
    removeTempFile,
} from "../../../../backend/temp.ts";

import {
    BeginFileMessage,
    BeginFileResponse,
    DeleteFileMessage,
    DeleteFileResponse,
    EndFileMessage,
    EndFileResponse,
    FileFrontendMessage,
    FindFilesMessage,
    FindFilesResponse,
    GetFileDetailsMessage,
    GetFileDetailsResponse,
    SendFileDataMessage,
    SendFileDataResponse,
    UpdateFileMessage,
    UpdateFileResponse,
    UpdateMultipleFilesMessage,
    UpdateMultipleFilesResponse,
} from "./messages.ts";
import {
    createFileRecord,
    deleteFileByUser,
    deleteFileRecord,
    fileExistsForUser,
    findFiles,
    getFileDetailsForUser,
    getFileRecordSize,
    setFileRecordData,
    updateFileRecord,
    updateMultipleFiles,
} from "$backend/repository/file-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addFileRequestSchema,
    updateMultipleFilesSchema,
} from "$schemas/file.ts";
import { CanManageFiles } from "$backend/rbac/permissions.ts";

const MAX_FILE_SIZE = +(Deno.env.get("MAX_FILE_SIZE") ?? "52428800");

const sanitizeTargetId = (targetId: string) =>
    targetId.replace(/[^a-zA-Z0-9-]/g, "");

const handleBeginFile: ListenerFn<BeginFileMessage> = async (
    { message: { size, name, mime_type }, sourceClient, respond },
) => {
    const targetId = await createTempFile(sourceClient?.userId.toString()!);

    const data = {
        name: name.replace(/[^a-zA-Z0-9_ .-]+/g, "-"),
        mime_type: mime_type.replace(/[^a-zA-Z0-9+._/-]/g, ""),
        size: +size,
    };

    if (data.size > MAX_FILE_SIZE) {
        throw new Error("File size is over the allowable limit.");
    }

    await requireValidSchema(addFileRequestSchema, data);

    await createFileRecord({
        ...data,
        identifier: targetId,
        user_id: sourceClient!.userId,
    });

    respond<BeginFileResponse>({
        target_id: targetId,
        type: "beginFileResponse",
    });
};

const handleSendFileData: ListenerFn<SendFileDataMessage> = async (
    {
        message: { target_id: unsafeTargetId, binaryData },
        respond,
        sourceClient,
    },
) => {
    const targetId = sanitizeTargetId(unsafeTargetId);

    await appendToTempFile(
        sourceClient?.userId.toString()!,
        targetId,
        new Uint8Array(binaryData),
    );

    const newSize = await getTempFileSize(
        sourceClient?.userId.toString()!,
        targetId,
    );

    if (newSize > MAX_FILE_SIZE) {
        throw new Error("File size is over the allowable limit.");
    }

    respond<SendFileDataResponse>({
        type: "sendFileDataResponse",
    });
};

const handleEndFile: ListenerFn<EndFileMessage> = async (
    { message: { target_id: unsafeTargetId }, respond, sourceClient },
) => {
    const targetId = sanitizeTargetId(unsafeTargetId);
    const exists = await fileExistsForUser(targetId, sourceClient?.userId!);

    if (!exists) {
        throw new Error("File not found.");
    }

    const storedSize = await getFileRecordSize(targetId);
    const tempSize = await getTempFileSize(
        sourceClient?.userId.toString()!,
        targetId,
    );

    if (storedSize !== null && storedSize !== tempSize) {
        await removeTempFile(sourceClient?.userId.toString()!, targetId);
        await deleteFileRecord(targetId);
        throw new Error("File size mismatch.");
    }

    await setFileRecordData(
        targetId,
        await readTempFile(sourceClient?.userId.toString()!, targetId),
    );
    await removeTempFile(sourceClient?.userId.toString()!, targetId);

    respond<EndFileResponse>({
        type: "endFileResponse",
    });
};

const handleFindFiles: ListenerFn<FindFilesMessage> = async (
    { message: { filters, page }, respond, sourceClient },
) => {
    if (!sourceClient!.auth.can(CanManageFiles.AllFiles)) {
        filters.allFiles = false;
    }

    const results = await findFiles(
        filters,
        sourceClient!.userId,
        page ?? 1,
    );

    respond<FindFilesResponse>({
        records: results,
        type: "findFilesResponse",
    });
};

const handleDeleteFile: ListenerFn<DeleteFileMessage> = async (
    { message: { identifier }, respond, sourceClient },
) => {
    if (sourceClient!.auth.can(CanManageFiles.AllFiles)) {
        await deleteFileRecord(identifier);
    } else {
        await deleteFileByUser(identifier, sourceClient!.userId);
    }

    respond<DeleteFileResponse>({
        identifier,
        type: "deleteFileResponse",
    });
};

const handleUpdateFile: ListenerFn<UpdateFileMessage> = async (
    { message: { identifier, is_public }, respond, sourceClient },
) => {
    const scopeByUserId = sourceClient!.auth.can(CanManageFiles.AllFiles)
        ? null
        : sourceClient!.userId;

    await updateFileRecord(
        identifier,
        is_public,
        scopeByUserId,
    );

    respond<UpdateFileResponse>({
        data: { identifier, is_public },
        type: "updateFileResponse",
    });
};

const handleGetFileDetails: ListenerFn<GetFileDetailsMessage> = async (
    { message: { identifiers }, respond, sourceClient },
) => {
    const records = await getFileDetailsForUser(
        identifiers,
        sourceClient!.userId,
    );

    respond<GetFileDetailsResponse>({
        records,
        type: "getFileDetailsResponse",
    });
};

const handleUpdateMultipleFiles: ListenerFn<UpdateMultipleFilesMessage> =
    async (
        { message: { data }, respond, sourceClient },
    ) => {
        await requireValidSchema(updateMultipleFilesSchema, data);

        await updateMultipleFiles(
            sourceClient!.userId,
            data.identifiers,
            data.data,
        );

        respond<UpdateMultipleFilesResponse>({
            data,
            type: "updateMultipleFilesResponse",
        });
    };

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {
    beginFile: handleBeginFile,
    endFile: handleEndFile,
    sendFileData: handleSendFileData,
    findFiles: handleFindFiles,
    deleteFile: handleDeleteFile,
    updateFile: handleUpdateFile,
    getFileDetails: handleGetFileDetails,
    updateMultipleFiles: handleUpdateMultipleFiles,
};
