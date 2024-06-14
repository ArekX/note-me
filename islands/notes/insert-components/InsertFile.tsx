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

const Component = ({
    onInsert,
    onCancel,
}: InsertComponentProps) => {
    const selectedFile = useSignal<FileMetaRecord | null>(null);

    return (
        <div class="w-full">
            <div>
                {selectedFile.value && (
                    <>
                        <DropdownMenu
                            popoverId="insertFile-0"
                            label="Insert"
                            inlineDirection="left"
                            items={[
                                {
                                    name: "Insert View Link",
                                    icon: "link-alt",
                                    onClick: () =>
                                        onInsert(
                                            `/file/${selectedFile.value?.identifier}`,
                                        ),
                                },
                                {
                                    name: "Insert Download Link",
                                    icon: "down-arrow-alt",
                                    onClick: () =>
                                        onInsert(
                                            `/file/${selectedFile.value?.identifier}?download`,
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
                    <Icon name="minus-circle" size="md" /> Cancel
                </Button>
            </div>
            <div>
                <div class="flex-grow">
                    {selectedFile.value && (
                        <div>
                            Selected:{" "}
                            <a
                                title={`Download ${selectedFile.value.name}`}
                                href={`/file/${selectedFile.value.identifier}?download`}
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

export const InsertFileDef: InsertComponent = {
    name: "File",
    component: Component,
};
