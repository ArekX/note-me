import FileUpload from "$islands/files/FileUpload.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
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
import { useEffect } from "preact/hooks";
import Input from "$components/Input.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { UploadProgressDialog } from "$islands/files/UploadProgressDialog.tsx";
import { FileDropWrapper } from "$islands/files/FileDropWrapper.tsx";

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
    color = "white",
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
                updateMultipleFilesResponse: (response) => {
                    for (const identifier of response.data.identifiers) {
                        const file = results.value.find(
                            (file) => file.identifier === identifier,
                        );

                        if (file) {
                            file.is_public = response.data.data.is_public;
                        }
                    }

                    results.value = [...results.value];
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

    const handleFilesDropped = async (files: File[]) => {
        await fileUploader.uploadFiles(files);
        await loadFiles();
    };

    const handleFilesUpload = async (files: File[]) => {
        await fileUploader.uploadFiles(files);
        await loadFiles();
    };

    useEffect(() => {
        loadFiles();
    }, []);

    return (
        <FileDropWrapper
            wrapperClass="file-picker w-full"
            onFilesDropped={handleFilesDropped}
        >
            <div class="w-full flex mb-2 items-end pb-4">
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
                        onFilesSelected={handleFilesUpload}
                    />
                </div>
                <UploadProgressDialog uploader={fileUploader} />
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
        </FileDropWrapper>
    );
}
