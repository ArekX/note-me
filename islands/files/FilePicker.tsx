import FileUpload from "$islands/files/FileUpload.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    FileFrontendResponse,
    FindFilesMessage,
    FindFilesResponse,
} from "../../workers/websocket/api/files/messages.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import Pagination from "$islands/Pagination.tsx";
import FileItem from "$islands/files/FileItem.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useFileUploader } from "./hooks/use-file-uploader.ts";
import Dialog from "$islands/Dialog.tsx";
import { useEffect } from "preact/hooks";
import Input from "$components/Input.tsx";
import { debounce } from "$frontend/deps.ts";

interface FilePickerProps {
    adminMode?: boolean;
    selectedFileId?: string;
    onFilePicked?: (file: FileMetaRecord | null) => void;
    color?: "black" | "white";
}

interface ExtendedFileMetaRecord extends FileMetaRecord {
    is_processing: boolean;
}

export default function FilePicker({
    color = "black",
    onFilePicked,
    selectedFileId,
    adminMode = false,
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
                    perPage.value = response.records.per_page;
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
    const search = useSignal("");

    const fileUploader = useFileUploader();

    const loadFiles = async () => {
        await sendMessage<FindFilesMessage, FindFilesResponse>(
            "files",
            "findFiles",
            {
                data: {
                    filters: {
                        name: search.value,
                        allFiles: adminMode,
                    },
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

    const handleToggleFileVisibility = async (file: ExtendedFileMetaRecord) => {
        file.is_processing = true;
        await sendMessage("files", "updateFile", {
            data: {
                identifier: file.identifier,
                is_public: !file.is_public,
            },
            expect: "updateFileResponse",
        });
    };

    const isDroppingFile = useSignal(false);

    const handleDragOver = (e: DragEvent) => {
        if (!e.dataTransfer) {
            return;
        }

        e.preventDefault();
        isDroppingFile.value = true;
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        isDroppingFile.value = false;
    };

    const handleDrop = async (e: DragEvent) => {
        e.preventDefault();

        if (!e.dataTransfer) {
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        await fileUploader.uploadFiles(files);
        await loadFiles();
        isDroppingFile.value = false;
    };

    const handleSearch = debounce((value: string) => {
        search.value = value;
        loader.start();
        loadFiles();
    }, 500);

    useEffect(() => {
        loader.start();
        loadFiles();
    }, []);

    return (
        <div
            class="file-picker w-full relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDroppingFile.value && (
                <div
                    onDragLeave={handleDragLeave}
                    class="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
                >
                    <p class="text-white text-2xl">Drop files to upload</p>
                </div>
            )}
            <div class="w-full flex mb-2 items-end">
                <div class="mr-2 flex-grow">
                    <Input
                        icon="search"
                        label="Search"
                        labelColor={color}
                        placeholder="Search..."
                        onInput={handleSearch}
                        value={search.value}
                    />
                </div>
                <div>
                    <FileUpload
                        onFileUploadDone={() => loadFiles()}
                        fileUploader={fileUploader}
                    />
                </div>

                {fileUploader.isUploading.value && (
                    <Dialog>
                        <p class="text-center">
                            Uploading progress {fileUploader.donePercentage}%
                        </p>
                        <progress
                            class="w-full"
                            max={fileUploader.totalSizeToUpload.value}
                            min="0"
                            value={fileUploader.uploadedSize.value}
                        />
                    </Dialog>
                )}
            </div>

            {loader.running
                ? (
                    <div class="text-center p-2">
                        <Loader color={color}>Loading files...</Loader>
                    </div>
                )
                : (
                    <>
                        <div class="grid grid-cols-5 gap-4">
                            {files.value.map((file) => (
                                <FileItem
                                    key={file.identifier}
                                    file={file}
                                    adminMode={adminMode}
                                    isSelected={selectedFileId ===
                                        file.identifier}
                                    onSelect={(f) => onFilePicked?.(f)}
                                    onDelete={(f) => fileToDelete.value = f}
                                    onToggleVisibility={handleToggleFileVisibility}
                                />
                            ))}
                            {files.value.length === 0 && (
                                <div>No files found.</div>
                            )}
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
