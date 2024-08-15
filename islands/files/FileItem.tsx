import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import FileSize from "$components/FileSize.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

export interface ExtendedFileMetaRecord extends FileMetaRecord {
    is_processing: boolean;
}

interface FileItemProps {
    file: ExtendedFileMetaRecord;
    isSelected: boolean;
    adminMode: boolean;
    onSelect: (file: ExtendedFileMetaRecord) => void;
    onSelectMultiple?: (file: ExtendedFileMetaRecord) => void;
    onDelete: (file: ExtendedFileMetaRecord) => void;
    onToggleVisibility: (file: ExtendedFileMetaRecord) => void;
}

const ImageViewer = ({ file }: { file: FileMetaRecord }) => {
    return (
        <img
            src={`/file/${file.identifier}`}
            class="h-40 inline-block rounded-tl-lg rounded-tr-lg"
            alt={file.name}
        />
    );
};

const VideoViewer = ({ file }: { file: FileMetaRecord }) => {
    return (
        <video
            controls
            src={`/file/${file.identifier}`}
            class="h-40 inline-block rounded-tl-lg rounded-tr-lg"
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
                class="h-8 block w-full rounded-tl-lg rounded-tr-lg"
            />
        </>
    );
};

const FileViewer = () => {
    return (
        <div class="h-40 flex items-center justify-center text-white rounded-tl-lg rounded-tr-lg">
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
    adminMode,
    onSelect,
    onSelectMultiple,
    onDelete,
    onToggleVisibility,
}: FileItemProps) {
    const Viewer = viewers[getViewerName(file)];

    return (
        <div
            key={file.identifier}
            class={`group rounded-lg border border-solid cursor-pointer relative ${
                isSelected
                    ? "border-blue-500"
                    : "border-gray-300 hover:border-gray-500"
            }`}
            onDblClick={() => {
                globalThis.open(`/file/${file.identifier}`);
            }}
            onClick={(e) => {
                if (e.ctrlKey && onSelectMultiple) {
                    onSelectMultiple(file);
                    return;
                }

                onSelect(file);
            }}
        >
            <div class="block text-center bg-slate-400 rounded-tl-lg rounded-tr-lg">
                <Viewer file={file} />
            </div>

            <div
                class="p-2 h-10 whitespace-nowrap overflow-hidden text-ellipsis"
                title={file.name}
            >
                {file.name}
            </div>

            <div class="text-xs p-2">
                Type: {file.mime_type.length > 0 ? file.mime_type : "unknown"}
                {" "}
                <br />
                Size: <FileSize size={file.size} /> <br />
                Only visible to you: {file.is_public ? "No" : "Yes"} <br />
                Uploaded: <TimeAgo time={file.created_at} /> <br />
                {adminMode && (
                    <>
                        <br />Created by: {file.created_by}
                    </>
                )}
            </div>

            {!file.is_processing && (
                <div class="absolute top-0 right-0 pr-2 pt-2 opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100 ">
                    <Button
                        color="danger"
                        size="xs"
                        title="Delete this file"
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
                                ? "Make this file visible only to you"
                                : "Make this file visible to everyone"}
                            onClick={(e: Event) => {
                                onToggleVisibility(file);
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <Icon
                                name={file.is_public ? "show" : "hide"}
                            />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
