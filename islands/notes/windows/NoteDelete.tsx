import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import { addSystemErrorMessage } from "$frontend/toast-message.ts";
import {
    DeleteNoteMessage,
    DeleteNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    DeleteFileMessage,
    DeleteFileResponse,
    GetFileDetailsMessage,
    GetFileDetailsResponse,
} from "$workers/websocket/api/files/messages.ts";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import { findFileIdentifiers } from "$frontend/markdown-links.ts";
import { FileMetaRecord } from "$db";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import FileSize from "$components/FileSize.tsx";

export default function NoteDelete(
    { noteId, record, onClose }: NoteWindowComponentProps,
) {
    const deleteLoader = useLoader();
    const filesLoader = useLoader();

    const files = useSignal<FileMetaRecord[]>([]);
    const selectedIdentifiers = useSignal<Set<string>>(new Set());

    const { sendMessage } = useWebsocketService();

    const loadReferencedFiles = filesLoader.wrap(async () => {
        const identifiers = findFileIdentifiers(record.text);

        if (identifiers.length === 0) {
            return;
        }

        try {
            const response = await sendMessage<
                GetFileDetailsMessage,
                GetFileDetailsResponse
            >("files", "getFileDetails", {
                data: {
                    identifiers,
                },
                expect: "getFileDetailsResponse",
            });

            files.value = response.records;
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        }
    });

    useEffect(() => {
        loadReferencedFiles();
    }, []);

    const handleToggleFile = (identifier: string, checked: boolean) => {
        const newSelected = new Set(selectedIdentifiers.value);

        if (checked) {
            newSelected.add(identifier);
        } else {
            newSelected.delete(identifier);
        }

        selectedIdentifiers.value = newSelected;
    };

    const areAllFilesSelected = files.value.length > 0 &&
        selectedIdentifiers.value.size === files.value.length;

    const handleToggleAllFiles = (checked: boolean) => {
        selectedIdentifiers.value = checked
            ? new Set(files.value.map((file) => file.identifier))
            : new Set();
    };

    const handleConfirmedDelete = deleteLoader.wrap(async () => {
        await sendMessage<DeleteNoteMessage, DeleteNoteResponse>(
            "notes",
            "deleteNote",
            {
                data: {
                    id: noteId,
                },
                expect: "deleteNoteResponse",
            },
        );

        try {
            for (const identifier of selectedIdentifiers.value) {
                await sendMessage<DeleteFileMessage, DeleteFileResponse>(
                    "files",
                    "deleteFile",
                    {
                        data: {
                            identifier,
                        },
                        expect: "deleteFileResponse",
                    },
                );
            }
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        }
    });

    return (
        <ConfirmDialog
            prompt={deleteLoader.running
                ? <Loader color="white">Deleting note...</Loader>
                : (
                    <>
                        <div>Are you sure you want to delete this note?</div>
                        {filesLoader.running && (
                            <div class="py-2">
                                <Loader color="white">
                                    Looking for uploaded files...
                                </Loader>
                            </div>
                        )}
                        {!filesLoader.running && files.value.length > 0 && (
                            <div class="py-2 text-left">
                                <p class="font-semibold">
                                    Uploaded files found in this note
                                </p>
                                <p class="py-1 text-sm text-gray-400">
                                    Checked files will be deleted together with
                                    the note.
                                </p>
                                <div class="py-1">
                                    <Checkbox
                                        label="Check all"
                                        checked={areAllFilesSelected}
                                        onChange={handleToggleAllFiles}
                                    />
                                </div>
                                <ul class="ml-2">
                                    {files.value.map((file) => (
                                        <li
                                            key={file.identifier}
                                            class="py-0.5"
                                        >
                                            <Checkbox
                                                label=""
                                                checked={selectedIdentifiers
                                                    .value
                                                    .has(file.identifier)}
                                                onChange={(checked) =>
                                                    handleToggleFile(
                                                        file.identifier,
                                                        checked,
                                                    )}
                                            />
                                            <a
                                                href={`/file/${file.identifier}`}
                                                target="_blank"
                                                class="text-gray-400 hover:underline"
                                            >
                                                {file.name}
                                            </a>{" "}
                                            (<FileSize size={file.size} />)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div class="py-2">
                            <strong>Important:</strong>{" "}
                            Deleted notes can still be recovered for the next 30
                            days from the time they are deleted.
                            {selectedIdentifiers.value.size > 0 && (
                                <>
                                    {" "}Deleted files are removed{" "}
                                    <strong>permanently</strong>{" "}
                                    and cannot be recovered.
                                </>
                            )}
                        </div>
                    </>
                )}
            isProcessing={deleteLoader.running}
            confirmText="Delete note"
            confirmColor="danger"
            visible
            onCancel={onClose}
            onConfirm={handleConfirmedDelete}
        />
    );
}
