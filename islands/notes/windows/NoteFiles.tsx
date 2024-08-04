import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import { findFileIdentifiers } from "$frontend/markdown-links.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useEffect } from "preact/hooks";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    FileFrontendResponse,
    GetFileDetailsMessage,
    UpdateMultipleFilesMessage,
} from "$workers/websocket/api/files/messages.ts";
import Loader from "$islands/Loader.tsx";

export default function NoteFiles(
    { noteId, onClose, record }: NoteWindowComponentProps,
) {
    const files = useSignal<FileMetaRecord[]>([]);

    const isShared = useSignal(false);
    const dataLoader = useLoader(true);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        FileFrontendResponse
    >({
        eventMap: {
            files: {
                getFileDetailsResponse: (data) => {
                    files.value = data.records;
                    dataLoader.stop();
                },
                updateMultipleFilesResponse: (response) => {
                    for (const identifier of response.data.identifiers) {
                        const file = files.value.find(
                            (file) => file.identifier === identifier,
                        );

                        if (file) {
                            file.is_public = response.data.data.is_public;
                        }
                    }

                    dataLoader.stop();
                },
            },
        },
    });

    const loadData = async () => {
        dataLoader.start();
        const shareResponse = await sendMessage<
            GetNoteShareDataMessage,
            GetNoteShareDataResponse
        >(
            "notes",
            "getNoteShareData",
            {
                data: {
                    note_id: noteId,
                },
                expect: "getNoteShareDataResponse",
            },
        );

        isShared.value = shareResponse.users.length > 0 ||
            shareResponse.links.length > 0;

        const identifiers = findFileIdentifiers(record.text);

        if (identifiers.length === 0) {
            dataLoader.stop();
            return;
        }

        dispatchMessage<
            GetFileDetailsMessage
        >("files", "getFileDetails", {
            identifiers,
        });
    };

    const handleToggleFilesVisibility = async () => {
        dataLoader.start();
        await dispatchMessage<
            UpdateMultipleFilesMessage
        >("files", "updateMultipleFiles", {
            data: {
                identifiers: files.value.map((file) => file.identifier),
                data: {
                    is_public: hasPrivateFiles(),
                },
            },
        });
    };

    const hasPrivateFiles = () => {
        return files.value.some((file) => !file.is_public);
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <Dialog visible={true} canCancel={true} onCancel={onClose}>
            <h1 class="text-2xl pb-4">Note Files</h1>

            {dataLoader.running ? <Loader color="white" /> : (
                <>
                    {files.value.length > 0
                        ? (
                            <>
                                <div class="py-4">
                                    Following uploaded files have been found in
                                    this note:
                                </div>
                                <ul class="list-disc ml-4">
                                    {files.value.map((file) => (
                                        <li key={file.identifier}>
                                            ({file.is_public
                                                ? "Public"
                                                : "Private"}){" "}
                                            <a
                                                href={`/file/${file.identifier}`}
                                                target="_blank"
                                                class="text-gray-400 hover:underline"
                                            >
                                                {file.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>

                                <div>
                                    {isShared.value && hasPrivateFiles() && (
                                        <p class="pt-4 text-sm">
                                            This note is shared with other
                                            users. Files are not automatically
                                            shared due to privacy concerns as
                                            they can be in multiple notes.
                                        </p>
                                    )}

                                    <div class="mt-2 text-right">
                                        <Button
                                            color="success"
                                            onClick={handleToggleFilesVisibility}
                                            addClass="mr-2"
                                        >
                                            Make all files in this note{" "}
                                            {hasPrivateFiles()
                                                ? "public"
                                                : "private"}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )
                        : <p>No uploaded files could be found in this note.</p>}
                </>
            )}

            <div class="py-4">
                <Button color="danger" onClick={onClose}>
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
