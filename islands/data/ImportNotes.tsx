import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import GroupPicker from "$islands/groups/GroupPicker.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { TreeRecord } from "$db";
import FileUpload from "$islands/files/FileUpload.tsx";
import {
    CreateNoteMessage,
    CreateNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { addMessage, addSystemErrorMessage } from "$frontend/toast-message.ts";

export default function ImportNotes() {
    const isDialogOpen = useSignal(false);
    const selectedGroup = useSelected<TreeRecord>();

    const importingLoader = useLoader();
    const doneFiles = useSignal(0);
    const totalFiles = useSignal(0);

    const { sendMessage } = useWebsocketService();

    const handleImportFiles = importingLoader.wrap(async (files: File[]) => {
        totalFiles.value = files.length;
        doneFiles.value = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                await sendMessage<CreateNoteMessage, CreateNoteResponse>(
                    "notes",
                    "createNote",
                    {
                        data: {
                            data: {
                                title: file.name,
                                text,
                                group_id: selectedGroup.selected.value?.id ??
                                    null,
                                is_encrypted: false,
                                tags: [],
                            },
                        },
                        expect: "createNoteResponse",
                    },
                );
            } catch (e) {
                if (e instanceof Error) {
                    addMessage({
                        type: "error",
                        text:
                            `Error while uploading a file ${file.name}: ${e.message}`,
                    });
                    continue;
                }
                const systemError = e as SystemErrorMessage;
                addSystemErrorMessage(systemError);
            }

            doneFiles.value++;
        }

        isDialogOpen.value = false;
        addMessage({
            type: "success",
            text: "File import completed.",
        });
    });

    return (
        <div>
            <h1 class="text-xl font-semibold">Import notes</h1>
            <p class="py-4">
                You can import notes notes from by uploading one or more files.
                Files must be in markdown or text format. The contents of the
                files will be imported as new notes.
            </p>
            <div>
                <Button
                    color="success"
                    onClick={() => isDialogOpen.value = true}
                >
                    <Icon name="import" /> Import Notes
                </Button>
            </div>
            <Dialog
                visible={isDialogOpen.value}
                canCancel={!importingLoader.running}
                onCancel={() => isDialogOpen.value = false}
            >
                {importingLoader.running
                    ? (
                        <div>
                            <h2 class="text-lg font-semibold">
                                Importing Notes
                            </h2>
                            <p class="py-4">
                                Importing {doneFiles.value} of{" "}
                                {totalFiles.value} files
                            </p>
                            <progress
                                class="w-full"
                                max={totalFiles.value}
                                min="0"
                                value={doneFiles.value}
                            />
                        </div>
                    )
                    : (
                        <div class="p-4">
                            <h2 class="text-lg font-semibold">Import Notes</h2>

                            <div class="py-4">
                                <p class="text-xl">Group to import into</p>
                                <GroupPicker
                                    allowRoot
                                    selectedId={selectedGroup.selected.value
                                        ?.id ??
                                        0}
                                    onPick={(record) =>
                                        selectedGroup.select(record)}
                                />
                            </div>

                            <FileUpload onFilesSelected={handleImportFiles} />
                        </div>
                    )}
            </Dialog>
        </div>
    );
}
