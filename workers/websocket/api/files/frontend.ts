import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    appendToTempFile,
    createTempFile,
    getTempFileSize,
    readTempFile,
    removeTempFile,
} from "$backend/temp.ts";

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
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addFileRequestSchema,
    updateMultipleFilesSchema,
} from "$schemas/file.ts";
import { CanManageFiles } from "$backend/rbac/permissions.ts";
import { db } from "$workers/database/lib.ts";
import { encodeBase64 } from "$std/encoding/base64.ts";

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

    await db.file.createFileRecord({
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
    const exists = await db.file.fileExistsForUser({
        identifier: targetId,
        user_id: sourceClient?.userId!,
    });

    if (!exists) {
        throw new Error("File not found.");
    }

    const storedSize = await db.file.getFileRecordSize(targetId);
    const tempSize = await getTempFileSize(
        sourceClient?.userId.toString()!,
        targetId,
    );

    if (storedSize !== null && storedSize !== tempSize) {
        await removeTempFile(sourceClient?.userId.toString()!, targetId);
        await db.file.deleteFileRecord(targetId);
        throw new Error("File size mismatch.");
    }

    await db.file.setFileRecordData({
        identifier: targetId,
        data: encodeBase64(
            await readTempFile(sourceClient?.userId.toString()!, targetId),
        ),
    });
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

    const results = await db.file.findFiles({
        filters,
        user_id: sourceClient!.userId,
        page: page ?? 1,
    });

    respond<FindFilesResponse>({
        records: results,
        type: "findFilesResponse",
    });
};

const handleDeleteFile: ListenerFn<DeleteFileMessage> = async (
    { message: { identifier }, respond, sourceClient },
) => {
    if (sourceClient!.auth.can(CanManageFiles.AllFiles)) {
        await db.file.deleteFileRecord(identifier);
    } else {
        await db.file.deleteFileByUser({
            user_id: sourceClient!.userId,
            identifier,
        });
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

    await db.file.updateFileRecord({
        identifier,
        scope_by_user_id: scopeByUserId,
        is_public,
    });

    respond<UpdateFileResponse>({
        data: { identifier, is_public },
        type: "updateFileResponse",
    });
};

const handleGetFileDetails: ListenerFn<GetFileDetailsMessage> = async (
    { message: { identifiers }, respond, sourceClient },
) => {
    const records = await db.file.getFileDetailsForUser({
        identifiers,
        user_id: sourceClient!.userId,
    });

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

        await db.file.updateMultipleFiles({
            user_id: sourceClient!.userId,
            identifiers: data.identifiers,
            data: data.data,
        });

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
