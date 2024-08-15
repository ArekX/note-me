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
import { useSignal } from "@preact/signals";

type InsertKeys =
    | "image"
    | "view-link"
    | "download-link"
    | "view-link-text"
    | "download-link-text";

const Component = ({
    onInsertDataChange,
}: InsertComponentProps) => {
    const selectedFiles = useSignal<FileMetaRecord[]>([]);

    const handlePickFile = (files: FileMetaRecord[]) => {
        selectedFiles.value = files;
        onInsertDataChange(files);
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
                    {selectedFiles.value.length > 0 && (
                        <div>
                            To be inserted:{" "}
                            <ul class="list-disc ml-4 block list-inside">
                                {selectedFiles.value.map((file) => (
                                    <li>
                                        <a
                                            title={`Download ${file.name}`}
                                            href={getFileDownloadUrl(
                                                file.identifier,
                                            )}
                                            target="_blank"
                                            class="underline font-semibold"
                                        >
                                            {file.name} ({file.is_public
                                                ? "Public"
                                                : "Private"})
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <FilePicker
                color="white"
                size="threeColumns"
                onFilesPicked={handlePickFile}
                selectedFileIds={selectedFiles.value.map((file) =>
                    file.identifier
                )}
            />
        </div>
    );
};

export const InsertFileDef: InsertComponent<
    "file",
    InsertKeys,
    FileMetaRecord[]
> = {
    id: "file",
    name: "File",
    component: Component,
    icon: "file",
    description: "Upload or select a file to insert",
    insertButtons: {
        image: {
            name: "Image",
            icon: "image",
            formatData: (files) =>
                files.map((file) =>
                    getImageMarkdown(getFileViewUrl(file.identifier), file.name)
                ).join("\n"),
        },
        "download-link": {
            name: "Download link",
            icon: "link",
            formatData: (files) =>
                files.map((file) =>
                    getLinkMarkdown(
                        getFileDownloadUrl(file.identifier),
                        file.name,
                    )
                ).join("\n"),
        },
        "view-link": {
            name: "In-browser link",
            icon: "link",
            formatData: (files) =>
                files.map((file) =>
                    getLinkMarkdown(getFileViewUrl(file.identifier), file.name)
                ).join("\n"),
        },
        "download-link-text": {
            name: "Download Link Text",
            icon: "text",
            formatData: (files) =>
                files.map((file) => getFileDownloadUrl(file.identifier)).join(
                    "\n",
                ),
        },
        "view-link-text": {
            name: "In-browser Link Text",
            icon: "text",
            formatData: (files) =>
                files.map((file) => getFileViewUrl(file.identifier)).join("\n"),
        },
    },
};
