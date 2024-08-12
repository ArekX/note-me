import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import FilePicker from "$islands/files/FilePicker.tsx";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import {
    getFileDownloadUrl,
    getFileViewUrl,
    getImageMarkdown,
    getLinkMarkdown,
} from "$islands/notes/helpers/markdown.ts";
import { useSelected } from "$frontend/hooks/use-selected.ts";

type InsertKeys =
    | "image"
    | "view-link"
    | "download-link"
    | "view-link-text"
    | "download-link-text";

const Component = ({
    onInsertDataChange,
}: InsertComponentProps) => {
    const selectedFile = useSelected<FileMetaRecord>();

    const handlePickFile = (file: FileMetaRecord | null) => {
        selectedFile.selected.value = file;
        onInsertDataChange(file);
    };

    return (
        <div class="w-full">
            <div class="py-2">
                Please select a file to insert. You can upload a new file or
                select an existing one. File can be inserted as an image, view
                or a download link.
            </div>
            <div>
                <div class="flex-grow">
                    {selectedFile.isSelected() && (
                        <div>
                            To be inserted:{" "}
                            <a
                                title={`Download ${
                                    selectedFile.selected.value!.name
                                }`}
                                href={getFileDownloadUrl(
                                    selectedFile.selected.value!.identifier,
                                )}
                                target="_blank"
                                class="underline font-semibold"
                            >
                                {selectedFile.selected.value!.name}{" "}
                                ({selectedFile.selected.value!.is_public
                                    ? "Public"
                                    : "Private"})
                            </a>
                        </div>
                    )}
                </div>
            </div>
            <FilePicker
                color="white"
                size="threeColumns"
                onFilePicked={handlePickFile}
                selectedFileId={selectedFile.selected.value?.identifier}
            />
        </div>
    );
};

export const InsertFileDef: InsertComponent<
    "file",
    InsertKeys,
    FileMetaRecord
> = {
    id: "file",
    name: "File",
    component: Component,
    icon: "file",
    description: "Upload or select a file to insert",
    insertButtons: {
        image: {
            name: "File as Image",
            icon: "image",
            formatData: (data) =>
                getImageMarkdown(getFileViewUrl(data.identifier), data.name),
        },
        "view-link": {
            name: "View Link",
            icon: "link",
            formatData: (data) =>
                getLinkMarkdown(getFileViewUrl(data.identifier), data.name),
        },
        "download-link": {
            name: "Download Link",
            icon: "link",
            formatData: (data) =>
                getLinkMarkdown(getFileDownloadUrl(data.identifier), data.name),
        },
        "view-link-text": {
            name: "View Link Text",
            icon: "link",
            formatData: (data) => getFileViewUrl(data.identifier),
        },
        "download-link-text": {
            name: "Download Link Text",
            icon: "link",
            formatData: (data) => getFileDownloadUrl(data.identifier),
        },
    },
};
