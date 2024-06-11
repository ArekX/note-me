import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    appendToTempFile,
    createTempFile,
    getTempFileSize,
    readTempFile,
    removeTempFile,
} from "$backend/file-upload.ts";

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
    SendFileDataMessage,
    SendFileDataResponse,
    UpdateFileMessage,
    UpdateFileResponse,
} from "./messages.ts";
import {
    createFileRecord,
    deleteFileRecord,
    deleteUserFile,
    fileExistsForUser,
    findUserFiles,
    getFileRecordSize,
    setFileRecordData,
    updateFileRecord,
} from "$backend/repository/file-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { addFileRequestSchema } from "$schemas/file.ts";

const MAX_FILE_SIZE = +(Deno.env.get("MAX_FILE_SIZE") ?? "52428800");

const sanitizeTargetId = (targetId: string) =>
    targetId.replace(/[^a-zA-Z0-9-]/g, "");

const handleBeginFile: ListenerFn<BeginFileMessage> = async (
    { message: { size, name, mimeType }, sourceClient, respond },
) => {
    const targetId = await createTempFile(sourceClient?.userId.toString()!);

    const data = {
        name: name.replace(/[^a-zA-Z0-9_ .-]+/g, "-"),
        mime_type: mimeType.replace(/[^a-zA-Z0-9+._/-]/g, ""),
        size: +size,
    };

    await requireValidSchema(addFileRequestSchema, data);

    await createFileRecord({
        ...data,
        identifier: targetId,
        user_id: sourceClient!.userId,
    });

    respond<BeginFileResponse>({
        targetId,
        type: "beginFileResponse",
    });
};

const handleSendFileData: ListenerFn<SendFileDataMessage> = async (
    {
        message: { targetId: unsafeTargetId, binaryData },
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
    { message: { targetId: unsafeTargetId }, respond, sourceClient },
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
    const results = await findUserFiles(
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
    await deleteUserFile(identifier, sourceClient!.userId);

    respond<DeleteFileResponse>({
        identifier,
        type: "deleteFileResponse",
    });
};

const handleUpdateFile: ListenerFn<UpdateFileMessage> = async (
    { message: { identifier, is_public }, respond, sourceClient },
) => {
    await updateFileRecord(
        identifier,
        is_public,
        sourceClient!.userId,
    );

    respond<UpdateFileResponse>({
        data: { identifier, is_public },
        type: "updateFileResponse",
    });
};

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {
    beginFile: handleBeginFile,
    endFile: handleEndFile,
    sendFileData: handleSendFileData,
    findFiles: handleFindFiles,
    deleteFile: handleDeleteFile,
    updateFile: handleUpdateFile,
};
