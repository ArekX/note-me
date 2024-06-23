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
import Picker, { PickerMap } from "$components/Picker.tsx";

interface InsertDialogProps {
    noteText: string;
    onInsert: (text: string) => void;
}

export interface InsertComponentProps {
    noteText: string;
    onCancel: () => void;
    onInsert: (text: string) => void;
}

export interface InsertComponent<T> {
    id: T;
    name: string;
    component: (props: InsertComponentProps) => JSX.Element;
}

type ComponentId<T extends { id: string }> = T["id"];

const insertComponents = [
    InsertLinkDef,
    InsertImageDef,
    InsertFileDef,
    InsertGroupListDef,
    InsertNoteLinkDef,
    InsertTocDef,
];

type InsertComponentIds =
    | ComponentId<typeof InsertLinkDef>
    | ComponentId<typeof InsertImageDef>
    | ComponentId<typeof InsertFileDef>
    | ComponentId<typeof InsertGroupListDef>
    | ComponentId<typeof InsertNoteLinkDef>
    | ComponentId<typeof InsertTocDef>;

const componentsMap: PickerMap<InsertComponentIds, InsertComponentProps> =
    insertComponents.reduce((map, def) => {
        map[def.id] = def.component;
        return map;
    }, {} as PickerMap<InsertComponentIds, InsertComponentProps>);

export default function InsertDialog({
    noteText,
    onInsert,
}: InsertDialogProps) {
    const selectedComponent = useSignal<InsertComponentIds>("image");
    const showDialog = useSignal(false);

    const handleCancel = () => {
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
                            items={insertComponents.map((component) => ({
                                label: component.name,
                                value: component.id,
                            }))}
                            value={selectedComponent.value.toString()}
                            onInput={(value) =>
                                selectedComponent.value =
                                    value as InsertComponentIds}
                        />
                    </div>

                    <Picker<InsertComponentIds, InsertComponentProps>
                        selector={selectedComponent.value}
                        propsGetter={() => ({
                            noteText,
                            onCancel: handleCancel,
                            onInsert,
                        })}
                        map={componentsMap}
                    />
                </Dialog>
            )}
        </div>
    );
}
