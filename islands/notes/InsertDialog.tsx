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
import DropdownList from "$components/DropdownList.tsx";
import { InsertTocDef } from "$islands/notes/insert-components/InsertToc.tsx";

interface InsertDialogProps {
    noteText: string;
    onInsert: (text: string) => void;
}

export interface InsertComponentProps {
    noteText: string;
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
    InsertTocDef,
];

export default function InsertDialog({
    noteText,
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
                    <div class="w-96 mb-2">
                        <DropdownList
                            label="Insert:"
                            items={insertComponents.map((component, index) => ({
                                label: component.name,
                                value: index.toString(),
                            }))}
                            value={selectedComponentIndex.value.toString()}
                            onInput={(value) =>
                                selectedComponentIndex.value = parseInt(value)}
                        />
                    </div>

                    <SelectedComponent
                        noteText={noteText}
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
