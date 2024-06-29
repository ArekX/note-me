import FileUpload from "$islands/files/FileUpload.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    FileFrontendResponse,
    FindFilesMessage,
    FindFilesResponse,
} from "$workers/websocket/api/files/messages.ts";
import Loader from "$islands/Loader.tsx";
import Pagination from "$islands/Pagination.tsx";
import FileItem from "$islands/files/FileItem.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useFileUploader } from "./hooks/use-file-uploader.ts";
import Dialog from "$islands/Dialog.tsx";
import { useEffect } from "preact/hooks";
import Input from "$components/Input.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";

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
                    if (!("is_public" in response.data)) {
                        return;
                    }

                    setPagedData({
                        results: results.value.map((file) => {
                            if (file.identifier === response.data.identifier) {
                                return {
                                    ...file,
                                    is_public: response.data.is_public,
                                    is_processing: false,
                                };
                            }
                            return file;
                        }),
                    });
                },
                deleteFileResponse: async (response) => {
                    setPagedData({
                        results: results.value.filter((file) =>
                            file.identifier !== response.identifier
                        ),
                    });

                    if (
                        selectedFileId === response.identifier
                    ) {
                        onFilePicked?.(null);
                    }

                    if (results.value.length === 0 && page.value > 1) {
                        page.value -= 1;
                    }

                    await loadFiles();
                },
                findFilesResponse: (response) => {
                    setPagedData({
                        results: response.records.results.map((f) => ({
                            ...f,
                            is_processing: false,
                        })),
                        total: response.records.total,
                        per_page: response.records.per_page,
                        page: response.records.page,
                    });

                    fileLoader.stop();
                },
            },
        },
    });

    const { results, perPage, page, total, setPagedData, resetPage } =
        usePagedData<
            ExtendedFileMetaRecord
        >();

    const fileToDelete = useSelected<ExtendedFileMetaRecord>();
    const fileLoader = useLoader(true);
    const { filters, setFilter } = useFilters({
        initialFilters: () => ({
            name: "",
        }),
        onFilterLoad: () => {
            resetPage();
            return loadFiles();
        },
    });

    const fileUploader = useFileUploader();

    const loadFiles = async () => {
        fileLoader.start();
        await sendMessage<FindFilesMessage, FindFilesResponse>(
            "files",
            "findFiles",
            {
                data: {
                    filters: {
                        name: filters.value.name,
                        allFiles: adminMode,
                    },
                    page: page.value,
                },
                expect: "findFilesResponse",
            },
        );
    };

    const handlePageChange = (page: number) => {
        setPagedData({ page });
        loadFiles();
    };

    const handleDeleteFile = async () => {
        if (!fileToDelete.selected.value) {
            return;
        }
        fileToDelete.selected.value.is_processing = true;
        await sendMessage("files", "deleteFile", {
            data: {
                identifier: fileToDelete.selected.value.identifier,
            },
            expect: "deleteFileResponse",
        });
        fileToDelete.unselect();
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

    useEffect(() => {
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
                        onInput={(value) => setFilter("name", value)}
                        value={filters.value.name}
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

            {fileLoader.running
                ? (
                    <div class="text-center p-2">
                        <Loader color={color}>Loading files...</Loader>
                    </div>
                )
                : (
                    <>
                        <div class="grid grid-cols-5 gap-4">
                            {results.value.map((file) => (
                                <FileItem
                                    key={file.identifier}
                                    file={file}
                                    adminMode={adminMode}
                                    isSelected={selectedFileId ===
                                        file.identifier}
                                    onSelect={(f) => onFilePicked?.(f)}
                                    onDelete={(f) => fileToDelete.select(f)}
                                    onToggleVisibility={handleToggleFileVisibility}
                                />
                            ))}
                            {total.value === 0 && <div>No files found.</div>}
                        </div>
                        <div class="mt-2 mb-2">
                            <Pagination
                                total={total.value}
                                perPage={perPage.value}
                                currentPage={page.value}
                                onChange={handlePageChange}
                            />
                        </div>
                    </>
                )}
            <ConfirmDialog
                visible={fileToDelete.selected.value !== null}
                prompt={
                    <div>
                        Are you sure you want to delete '{fileToDelete.selected
                            .value
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
                onCancel={() => fileToDelete.unselect()}
            />
        </div>
    );
}
