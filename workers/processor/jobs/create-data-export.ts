import { JobHandler } from "$workers/processor/jobs/mod.ts";
import { createZip, ZipFile } from "$backend/zip.ts";
import { decryptNote } from "$backend/encryption.ts";
import { extname } from "$std/path/mod.ts";
import { sendMessageToWebsocket } from "$workers/websocket/websocket-worker-message.ts";
import {
    NotifyUserExportFailedMessage,
    NotifyUserExportFinishedMessage,
    NotifyUserExportUpdatedMessage,
} from "$workers/websocket/api/users/messages.ts";
import { getExportLocation } from "$backend/export-generator.ts";
import { db } from "$workers/database/lib.ts";
import { decodeBase64 } from "$std/encoding/base64.ts";

export interface CreateDataExportJob {
    user_id: number;
    user_password: string;
    export_id: string;
}

const notifyUserPercentageUpdate = (
    export_id: string,
    user_id: number,
    percentage: number,
) => {
    sendMessageToWebsocket<NotifyUserExportUpdatedMessage>(
        "users",
        "notifyUserExportUpdated",
        {
            export_id,
            user_id,
            percentage: +percentage.toFixed(2),
        },
    );
};

const notifyUserExportFailed = (
    export_id: string,
    user_id: number,
    message: string,
) => {
    sendMessageToWebsocket<NotifyUserExportFailedMessage>(
        "users",
        "notifyUserExportFailed",
        {
            export_id,
            user_id,
            message,
        },
    );
};

const toFilesystemName = (name: string, extension: string = "") =>
    name.replace(/[^a-zA-Z0-9]/g, "-") + extension;

interface ResolveNoteContentOptions {
    note_id: number;
    user_id: number;
    decryption_key: string;
    user_password: string;
    file_map: Map<string, string>;
}

const resolveNoteContent = async ({
    note_id,
    user_id,
    decryption_key,
    user_password,
    file_map,
}: ResolveNoteContentOptions) => {
    const details = await db.note.getNoteDetails({
        note_id,
        user_id,
        options: {
            include_note: true,
        },
    });

    if (!details) {
        return "";
    }

    let contents = details.is_encrypted
        ? await decryptNote(details.note, decryption_key, user_password)
        : details.note;

    for (const file of file_map.keys()) {
        contents = contents.replace(
            new RegExp(`/file/${file}`, "g"),
            `/file/${file_map.get(file)!}`,
        );
    }

    return contents;
};

interface ProcessGroupOptions {
    zip: ZipFile;
    export_id: string;
    user_id: number;
    decryption_key: string;
    user_password: string;
    group_id: number | null;
    file_map: Map<string, string>;
    prefix: string;
    total_user_notes: number;
    done_user_notes: number;
    abort_signal: AbortSignal;
}

const processGroup = async (options: ProcessGroupOptions) => {
    if (options.abort_signal.aborted) {
        return;
    }

    const notes = await db.treeList.getTreeList({
        group_id: options.group_id,
        user_id: options.user_id,
        type: "note",
    });
    let doneNotes = 0;
    for (const note of notes) {
        if (options.abort_signal.aborted) {
            return;
        }

        const content = await resolveNoteContent({
            note_id: note.id,
            user_id: options.user_id,
            decryption_key: options.decryption_key,
            user_password: options.user_password,
            file_map: options.file_map,
        });

        await options.zip.addTextFile(
            `${options.prefix}/${toFilesystemName(note.name)}.md`,
            content,
        );
        doneNotes += 1;
    }

    options.done_user_notes += doneNotes;
    notifyUserPercentageUpdate(
        options.export_id,
        options.user_id,
        50 + (options.done_user_notes / options.total_user_notes) * 50,
    );

    const groups = await db.group.getUserGroups({
        parent_id: options.group_id,
        user_id: options.user_id,
    });

    for (const group of groups) {
        if (options.abort_signal.aborted) {
            return;
        }

        await processGroup({
            ...options,
            group_id: group.id,
            prefix: `${options.prefix}/${toFilesystemName(group.name)}`,
        });
    }
};

export const processFiles = async (
    zip: ZipFile,
    export_id: string,
    user_id: number,
    abort_signal: AbortSignal,
) => {
    const fileCount = await db.file.getUserFileCount(user_id);
    let doneCount = 0;
    let page = 1;

    let files = await db.file.findFiles({
        user_id,
        page,
        filters: {},
    });

    const fileMap = new Map<string, string>();

    while (files.results.length > 0) {
        for (const file of files.results) {
            if (abort_signal.aborted) {
                return fileMap;
            }

            const fileData = await db.file.getFileData(file.identifier);

            if (!fileData || !fileData.data) {
                continue;
            }

            const extension = extname(fileData.name);

            await zip.addBinaryFile(
                `file/${file.identifier}${extension}`,
                decodeBase64(fileData.data),
            );

            fileMap.set(file.identifier, `${file.identifier}${extension}`);
            doneCount += 1;
        }

        if (abort_signal.aborted) {
            return fileMap;
        }

        page += 1;
        files = await db.file.findFiles({
            user_id,
            page,
            filters: {},
        });
        notifyUserPercentageUpdate(
            export_id,
            user_id,
            (doneCount / fileCount) * 50,
        );
    }

    return fileMap;
};

export const tryProcessJob = async (
    {
        user_id,
        user_password,
        export_id,
    }: CreateDataExportJob,
    abortSignal: AbortSignal,
) => {
    const fileLocation = await getExportLocation(
        export_id,
        user_id,
    );
    using zip = await createZip(fileLocation);

    abortSignal.onabort = async () => {
        zip.finalize();
        await Deno.remove(fileLocation);
    };

    const decryptionKey = await db.user.getNoteEncryptionKey(user_id);

    if (!decryptionKey) {
        throw new Error("Failed to get decryption key for user");
    }

    const fileMap = await processFiles(
        zip,
        export_id,
        user_id,
        abortSignal,
    );

    if (abortSignal.aborted) {
        return;
    }

    const totalNoteCount = await db.note.getUserNoteCount(user_id);

    await processGroup({
        zip,
        export_id,
        user_id,
        decryption_key: decryptionKey,
        user_password,
        group_id: null,
        prefix: "notes",
        file_map: fileMap,
        total_user_notes: totalNoteCount,
        done_user_notes: 0,
        abort_signal: abortSignal,
    });

    if (abortSignal.aborted) {
        return;
    }

    await zip.finalize();

    sendMessageToWebsocket<NotifyUserExportFinishedMessage>(
        "users",
        "notifyUserExportFinished",
        {
            user_id,
            export_id,
        },
    );
};

export const createDataExportJobHandler: JobHandler<CreateDataExportJob> =
    async (
        job: CreateDataExportJob,
        abortSignal,
    ) => {
        try {
            await tryProcessJob(job, abortSignal);
        } catch (e: Error | unknown) {
            notifyUserExportFailed(
                job.export_id,
                job.user_id,
                (e as Error).message,
            );
        }
    };
