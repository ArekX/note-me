import FileUpload from "$islands/files/FileUpload.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    FileFrontendResponse,
    FindFilesMessage,
    FindFilesResponse,
} from "$workers/websocket/api/file/messages.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import Pagination from "$islands/Pagination.tsx";
import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import FileItem from "$islands/files/FileItem.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";

interface FilePickerProps {
    selectedFileId?: string;
    onFilePicked?: (file: FileMetaRecord | null) => void;
    color?: "black" | "white";
}

interface ExtendedFileMetaRecord extends FileMetaRecord {
    is_processing: boolean;
}

export default function FilePicker({
    color,
    onFilePicked,
    selectedFileId,
}: FilePickerProps) {
    const { sendMessage } = useWebsocketService<
        FileFrontendResponse
    >({
        eventMap: {
            files: {
                updateFileResponse: (response) => {
                    if ("is_public" in response.data) {
                        files.value = files.value.map((file) => {
                            if (file.identifier === response.data.identifier) {
                                return {
                                    ...file,
                                    is_public: response.data.is_public,
                                    is_processing: false,
                                };
                            }
                            return file;
                        });
                    }
                },
                deleteFileResponse: async (response) => {
                    files.value = files.value.filter((file) =>
                        file.identifier !== response.identifier
                    );

                    if (
                        selectedFileId === response.identifier
                    ) {
                        onFilePicked?.(null);
                    }

                    if (files.value.length === 0 && currentPage.value > 1) {
                        currentPage.value -= 1;
                    }

                    await loadFiles();
                },
                findFilesResponse: (response) => {
                    files.value = response.records.results.map((f) => ({
                        ...f,
                        is_processing: false,
                    }));

                    totalFiles.value = response.records.total;
                    perPage.value = response.records.perPage;
                    currentPage.value = response.records.page;

                    loader.stop();
                },
            },
        },
    });
    const loader = useLoader();

    const files = useSignal<ExtendedFileMetaRecord[]>([]);
    const totalFiles = useSignal(0);
    const perPage = useSignal(0);
    const currentPage = useSignal(1);
    const fileToDelete = useSignal<ExtendedFileMetaRecord | null>(null);

    const loadFiles = async () => {
        await sendMessage<FindFilesMessage, FindFilesResponse>(
            "files",
            "findFiles",
            {
                data: {
                    filters: {},
                    page: currentPage.value,
                },
                expect: "findFilesResponse",
            },
        );
    };

    const handlePageChange = (page: number) => {
        currentPage.value = page;
        loader.start();
        loadFiles();
    };

    const handleDeleteFile = async () => {
        if (!fileToDelete.value) {
            return;
        }
        fileToDelete.value.is_processing = true;
        await sendMessage("files", "deleteFile", {
            data: {
                identifier: fileToDelete.value.identifier,
            },
            expect: "deleteFileResponse",
        });
        fileToDelete.value = null;
    };

    const toggleFileVisibility = async (file: ExtendedFileMetaRecord) => {
        file.is_processing = true;
        await sendMessage("files", "updateFile", {
            data: {
                identifier: file.identifier,
                is_public: !file.is_public,
            },
            expect: "updateFileResponse",
        });
    };

    useScriptsReadyEffect(() => {
        loader.start();
        loadFiles();
    });

    return (
        <div class="w-full">
            <div class="w-full text-right mb-2">
                <FileUpload onFileUploadDone={() => loadFiles()} />
            </div>

            {loader.running && (
                <div class="text-center">
                    <Loader color={color}>Loading files...</Loader>
                </div>
            )}
            {!loader.running && (
                <>
                    <div class="grid grid-cols-5 gap-4">
                        {files.value.map((file) => (
                            <FileItem
                                key={file.identifier}
                                file={file}
                                isSelected={selectedFileId === file.identifier}
                                onSelect={(f) => onFilePicked?.(f)}
                                onDelete={(f) => fileToDelete.value = f}
                                onToggleVisibility={toggleFileVisibility}
                            />
                        ))}
                    </div>
                    <Pagination
                        total={totalFiles.value}
                        perPage={perPage.value}
                        currentPage={currentPage.value}
                        onChange={handlePageChange}
                    />
                </>
            )}
            <ConfirmDialog
                visible={fileToDelete.value !== null}
                prompt={
                    <div>
                        Are you sure you want to delete '{fileToDelete.value
                            ?.name}' file?
                        <p>
                            This action cannot be undone and all notes
                            referencing this file will not be able to show it.
                        </p>
                    </div>
                }
                confirmColor="danger"
                confirmText="Delete this file"
                onConfirm={handleDeleteFile}
                onCancel={() => fileToDelete.value = null}
            />
        </div>
    );
}
