import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { InsertLinkDef } from "$islands/notes/insert-components/InsertLink.tsx";
import { useSignal } from "@preact/signals";
import { JSX } from "preact/jsx-runtime";
import { InsertImageDef } from "$islands/notes/insert-components/InsertImage.tsx";
import { InsertFileDef } from "$islands/notes/insert-components/InsertFile.tsx";
import { InsertGroupListDef } from "$islands/notes/insert-components/InsertGroupList.tsx";
import { InsertNoteLinkDef } from "$islands/notes/insert-components/InsertNoteLink.tsx";
import { useEffect } from "preact/hooks";

interface InsertDialogProps {
    onInsert: (text: string) => void;
}

export interface InsertComponentProps {
    onCancel: () => void;
    onInsert: (text: string) => void;
}

export interface InsertComponent {
    name: string;
    component: (props: InsertComponentProps) => JSX.Element;
}

const insertComponents: InsertComponent[] = [
    InsertLinkDef,
    InsertImageDef,
    InsertFileDef,
    InsertGroupListDef,
    InsertNoteLinkDef,
];

export default function InsertDialog({
    onInsert,
}: InsertDialogProps) {
    const selectedComponentIndex = useSignal(0);
    const showDialog = useSignal(false);

    const SelectedComponent =
        insertComponents[selectedComponentIndex.value].component;

    const handleCancel = () => {
        selectedComponentIndex.value = 0;
        showDialog.value = false;
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "i") {
                showDialog.value = true;
                e.preventDefault();
            }
        };

        document.addEventListener("keydown", handleHotkeys);

        return () => {
            document.removeEventListener("keydown", handleHotkeys);
        };
    }, []);

    return (
        <div class="fixed bottom-5 right-8 opacity-30 hover:opacity-100">
            <Button
                color="success"
                title="Insert item"
                onClick={() => showDialog.value = true}
            >
                <Icon name="plus" />
            </Button>
            {showDialog.value && (
                <Dialog
                    visible={true}
                    canCancel={true}
                    onCancel={handleCancel}
                    props={{
                        class: "w-2/3",
                    }}
                >
                    <div class="w-96">
                        <select
                            class="text-black w-full block mb-6"
                            value={selectedComponentIndex}
                            onInput={(e) =>
                                selectedComponentIndex.value =
                                    (e.target as HTMLSelectElement)
                                        .selectedIndex}
                        >
                            {insertComponents.map((component, index) => (
                                <option
                                    selected={index ===
                                        selectedComponentIndex.value}
                                    value={index}
                                >
                                    {component.name}
                                </option>
                            ))}
                        </select>

                        <div class="pt-6">
                            <Button
                                color="danger"
                                onClick={() => handleCancel()}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>

                    <SelectedComponent
                        onInsert={(text) => {
                            onInsert(text);
                            handleCancel();
                        }}
                         onCancel={handleCancel}
                    />
                </Dialog>
            )}
        </div>
    );
}
