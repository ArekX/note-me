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

interface InsertDialogProps {
    show: boolean;
    onShowRequest: (shouldShow: boolean) => void;
    onInsert: (text: string) => void;
}

export interface InsertComponentProps {
    onInput: (text: string) => void;
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
    show,
    onShowRequest,
    onInsert,
}: InsertDialogProps) {
    const selectedComponentIndex = useSignal(0);
    const textToInsert = useSignal("");

    const handleInsert = () => {
        onInsert(textToInsert.value);
        onShowRequest(false);
    };

    const SelectedComponent =
        insertComponents[selectedComponentIndex.value].component;

    return (
        <div class="fixed bottom-5 right-8 opacity-30 hover:opacity-100">
            <Button
                color="success"
                title="Insert item"
                onClick={() => onShowRequest(true)}
            >
                <Icon name="plus" />
            </Button>
            <Dialog
                visible={show}
                canCancel={true}
                onCancel={() => onShowRequest(false)}
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
                                (e.target as HTMLSelectElement).selectedIndex}
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

                    <SelectedComponent
                        onInput={(text) => textToInsert.value = text}
                    />

                    <div class="pt-6">
                        <Button color="success" onClick={handleInsert}>
                            Insert
                        </Button>{" "}
                        <Button
                            color="danger"
                            onClick={() => onShowRequest(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
