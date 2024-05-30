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
    EndFileMessage,
    EndFileResponse,
    FileFrontendMessage,
    SendFileDataMessage,
    SendFileDataResponse,
} from "./messages.ts";
import {
    createFileRecord,
    deleteFileRecord,
    getFileRecordSize,
    setFileRecordData,
} from "$backend/repository/file-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { addFileRequestSchema } from "$schemas/file.ts";

const MAX_FILE_SIZE = 1024 * 1024 * 50; // 50MB

const handleBeginFile: ListenerFn<BeginFileMessage> = async (
    { message: { size, name, mimeType }, sourceClient, respond },
) => {
    const targetId = await createTempFile();

    const data = {
        name,
        mime_type: mimeType,
        size,
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
    { message, respond },
) => {
    await appendToTempFile(
        message.targetId,
        new Uint8Array(message.binaryData),
    );

    const newSize = await getTempFileSize(message.targetId);

    if (newSize > MAX_FILE_SIZE) {
        throw new Error("File size is over the allowable limit.");
    }

    respond<SendFileDataResponse>({
        type: "sendFileDataResponse",
    });
};

const handleEndFile: ListenerFn<EndFileMessage> = async (
    { message: { targetId }, respond },
) => {
    const storedSize = await getFileRecordSize(targetId);
    const tempSize = await getTempFileSize(targetId);

    if (storedSize !== null && storedSize !== tempSize) {
        await removeTempFile(targetId);
        await deleteFileRecord(targetId);
        throw new Error("File size mismatch.");
    }

    await setFileRecordData(targetId, await readTempFile(targetId));
    await removeTempFile(targetId);

    respond<EndFileResponse>({
        type: "endFileResponse",
    });
};

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {
    beginFile: handleBeginFile,
    endFile: handleEndFile,
    sendFileData: handleSendFileData,
};
