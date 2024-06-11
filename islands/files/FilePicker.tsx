import FileUpload from "$islands/files/FileUpload.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    FindFilesMessage,
    FindFilesResponse,
} from "$workers/websocket/api/file/messages.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import Pagination from "$islands/Pagination.tsx";
import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { getUserData } from "$frontend/user-data.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";

export interface PickedFile {
    name: string;
}

interface FilePickerProps {
    onFilePicked?: (file: PickedFile) => void;
}

const isImage = (file: FileMetaRecord) => {
    return file.mime_type.startsWith("image/");
};

const renderClosestDisplaySize = (size: number) => {
    if (size < 1024) {
        return `${size} bytes`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else {
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    }
};

export default function FilePicker({}: FilePickerProps) {
    const { sendMessage } = useWebsocketService();
    const loader = useLoader();

    const selectedFile = useSignal<FileMetaRecord | null>(null);

    const files = useSignal<FileMetaRecord[]>([]);
    const totalFiles = useSignal(0);
    const perPage = useSignal(0);
    const currentPage = useSignal(1);

    const loadFiles = async () => {
        loader.start();

        const response = await sendMessage<FindFilesMessage, FindFilesResponse>(
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

        files.value = response.records.results;
        totalFiles.value = response.records.total;
        perPage.value = response.records.perPage;
        currentPage.value = response.records.page;

        loader.stop();
    };

    const handlePageChange = (page: number) => {
        currentPage.value = page;
        loadFiles();
    };

    const handleDeleteFile = async (file: FileMetaRecord) => {
        loader.start();

        await sendMessage("files", "deleteFile", {
            data: {
                identifier: file.identifier,
            },
            expect: "deleteFileResponse",
        });

        loadFiles();
    };

    useScriptsReadyEffect(() => {
        loadFiles();
    });

    return (
        <div class="w-full">
            FilePicker

            <FileUpload onFileUploadDone={() => loadFiles()} />
            {selectedFile.value && (
                <div>
                    Selected file: {selectedFile.value.name}
                </div>
            )}

            {loader.running && (
                <div class="text-center">
                    <Loader>Loading files...</Loader>
                </div>
            )}
            {!loader.running && (
                <>
                    <div class="grid grid-cols-5 gap-4">
                        {files.value.map((file) => (
                            <div
                                key={file.identifier}
                                class={`group rounded border-2 border-solid  cursor-pointer  relative ${
                                    selectedFile.value?.identifier ===
                                            file.identifier
                                        ? "border-blue-500"
                                        : "border-gray-300 hover:border-gray-500"
                                }`}
                                onClick={() => {
                                    if (selectedFile.value !== file) {
                                        selectedFile.value = file;
                                    } else {
                                        selectedFile.value = null;
                                    }
                                }}
                            >
                                <div class="block text-center bg-slate-400">
                                    {isImage(file) && (
                                        <img
                                            src={`/file/${file.identifier}`}
                                            class="h-40 inline-block"
                                            alt={file.name}
                                        />
                                    )}
                                </div>

                                <div
                                    class="p-2 h-10 whitespace-nowrap overflow-hidden text-ellipsis"
                                    title={file.name}
                                >
                                    {file.name}
                                </div>

                                <div class="text-xs p-2">
                                    Type: {file.mime_type} <br />
                                    Size: {renderClosestDisplaySize(file.size)}
                                    {" "}
                                    <br />
                                    Public: {file.is_public ? "Yes" : "No"}{" "}
                                    <br />
                                    Uploaded at: {getUserData().formatDateTime(
                                        file.created_at,
                                    )}
                                </div>

                                <div class="absolute top-0 right-0 pr-2 pt-2 opacity-0 group-hover:opacity-30 group-hover:hover:opacity-100 ">
                                    <Button
                                        color="danger"
                                        size="xs"
                                        onClick={(e: Event) => {
                                            handleDeleteFile(file);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Icon name="minus-circle" />
                                    </Button>
                                    <div class="pt-1">
                                        <Button
                                            color="primary"
                                            size="xs"
                                            onClick={(e: Event) => {
                                                handleDeleteFile(file);
                                                e.stopPropagation();
                                            }}
                                        >
                                            <Icon
                                                name={file.is_public
                                                    ? "hide"
                                                    : "show"}
                                            />
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
}
