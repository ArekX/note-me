import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import FilePicker from "$islands/files/FilePicker.tsx";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import { FileMetaRecord } from "$backend/repository/file-repository.ts";
import DropdownMenu from "$islands/DropdownMenu.tsx";
import {
    getFileDownloadUrl,
    getFileViewUrl,
    getImageMarkdown,
    getLinkMarkdown,
} from "$islands/notes/helpers/markdown.ts";

const Component = ({
    onInsert,
    onCancel,
}: InsertComponentProps) => {
    const selectedFile = useSignal<FileMetaRecord | null>(null);

    return (
        <div class="w-full">
            <div class="mb-2">
                {selectedFile.value && (
                    <>
                        <DropdownMenu
                            popoverId="insertFile-0"
                            label="Insert"
                            iconSize="lg"
                            inlineDirection="left"
                            items={[
                                {
                                    name: "Image",
                                    icon: "image",
                                    onClick: () =>
                                        onInsert(
                                            getImageMarkdown(
                                                getFileViewUrl(
                                                    selectedFile.value!
                                                        .identifier,
                                                ),
                                                selectedFile.value!.name,
                                            ),
                                        ),
                                },
                                {
                                    name: "View Link",
                                    icon: "link",
                                    onClick: () =>
                                        onInsert(
                                            getLinkMarkdown(
                                                getFileViewUrl(
                                                    selectedFile.value!
                                                        .identifier,
                                                ),
                                                selectedFile.value!.name,
                                            ),
                                        ),
                                },
                                {
                                    name: "Download Link",
                                    icon: "down-arrow-alt",
                                    onClick: () =>
                                        onInsert(
                                            getLinkMarkdown(
                                                getFileDownloadUrl(
                                                    selectedFile.value!
                                                        .identifier,
                                                ),
                                                selectedFile.value!.name,
                                            ),
                                        ),
                                },
                                {
                                    name: "View Link as Text",
                                    icon: "text",
                                    onClick: () =>
                                        onInsert(
                                            getFileViewUrl(
                                                selectedFile.value!
                                                    .identifier,
                                            ),
                                        ),
                                },
                                {
                                    name: "Download Link as Text",
                                    icon: "text",
                                    onClick: () =>
                                        onInsert(
                                            getFileDownloadUrl(
                                                selectedFile.value!
                                                    .identifier,
                                            ),
                                        ),
                                },
                            ]}
                        />
                        {" "}
                    </>
                )}

                <Button
                    color="danger"
                    onClick={onCancel}
                    size="md"
                >
                    <Icon name="minus-circle" size="lg" /> Cancel
                </Button>
            </div>
            <div>
                <div class="flex-grow">
                    {selectedFile.value && (
                        <div>
                            Selected:{" "}
                            <a
                                title={`Download ${selectedFile.value.name}`}
                                href={getFileDownloadUrl(
                                    selectedFile.value.identifier,
                                )}
                                target="_blank"
                                class="underline"
                            >
                                {selectedFile.value.name}
                            </a>
                        </div>
                    )}
                </div>
            </div>
            <FilePicker
                color="white"
                onFilePicked={(f) => selectedFile.value = f}
                selectedFileId={selectedFile.value?.identifier}
            />
        </div>
    );
};

export const InsertFileDef: InsertComponent<"file"> = {
    id: "file",
    name: "File",
    component: Component,
};
