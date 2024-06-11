import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { getUserData } from "$frontend/user-data.ts";

export interface ExtendedFileMetaRecord extends FileMetaRecord {
    is_processing: boolean;
}

interface FileItemProps {
    file: ExtendedFileMetaRecord;
    isSelected: boolean;
    onSelect: (file: ExtendedFileMetaRecord) => void;
    onDelete: (file: ExtendedFileMetaRecord) => void;
    onToggleVisibility: (file: ExtendedFileMetaRecord) => void;
}

const renderClosestDisplaySize = (size: number) => {
    if (size < 1024) {
        return `${size} bytes`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else {
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    }
};

const ImageViewer = ({ file }: { file: FileMetaRecord }) => {
    return (
        <img
            src={`/file/${file.identifier}`}
            class="h-40 inline-block"
            alt={file.name}
        />
    );
};

const VideoViewer = ({ file }: { file: FileMetaRecord }) => {
    return (
        <video
            controls
            src={`/file/${file.identifier}`}
            class="h-40 inline-block"
        />
    );
};

const AudioViewer = ({ file }: { file: FileMetaRecord }) => {
    return (
        <>
            <div class="h-32 flex items-center justify-center text-white">
                <Icon name="music" type="solid" size="5xl" />
            </div>
            <audio
                controls
                src={`/file/${file.identifier}`}
                class="h-8 block w-full"
            />
        </>
    );
};

const FileViewer = () => {
    return (
        <div class="h-40 flex items-center justify-center text-white">
            <Icon name="file" size="5xl" />
        </div>
    );
};

const viewers = {
    image: ImageViewer,
    video: VideoViewer,
    audio: AudioViewer,
    file: FileViewer,
};

const getViewerName = (file: FileMetaRecord) => {
    if (file.mime_type.startsWith("image/")) {
        return "image";
    }

    if (file.mime_type.startsWith("video/")) {
        return "video";
    }

    if (file.mime_type.startsWith("audio/")) {
        return "audio";
    }

    return "file";
};

export default function FileItem({
    file,
    isSelected,
    onSelect,
    onDelete,
    onToggleVisibility,
}: FileItemProps) {
    const Viewer = viewers[getViewerName(file)];

    return (
        <div
            key={file.identifier}
            class={`group rounded border-2 border-solid  cursor-pointer  relative ${
                isSelected
                    ? "border-blue-500"
                    : "border-gray-300 hover:border-gray-500"
            }`}
            onDblClick={() => {
                globalThis.open(`/file/${file.identifier}`);
            }}
            onClick={() => {
                onSelect(file);
            }}
        >
            <div class="block text-center bg-slate-400">
                <Viewer file={file} />
            </div>

            <div
                class="p-2 h-10 whitespace-nowrap overflow-hidden text-ellipsis"
                title={file.name}
            >
                {file.name}
            </div>

            <div class="text-xs p-2">
                Type: {file.mime_type} <br />
                Size: {renderClosestDisplaySize(file.size)} <br />
                Public: {file.is_public ? "Yes" : "No"} <br />
                Uploaded at: {getUserData().formatDateTime(
                    file.created_at,
                )}
            </div>

            {!file.is_processing && (
                <div class="absolute top-0 right-0 pr-2 pt-2 opacity-0 group-hover:opacity-30 group-hover:hover:opacity-100 ">
                    <Button
                        color="danger"
                        size="xs"
                        onClick={(e: Event) => {
                            onDelete(file);
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                    >
                        <Icon name="minus-circle" />
                    </Button>
                    <div class="pt-1">
                        <Button
                            color="primary"
                            size="xs"
                            title={file.is_public
                                ? "Set as private"
                                : "Set as public"}
                            onClick={(e: Event) => {
                                onToggleVisibility(file);
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <Icon
                                name={file.is_public ? "hide" : "show"}
                            />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
