import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { InsertLinkDef } from "$islands/notes/insert-components/InsertLink.tsx";
import { useSignal } from "@preact/signals";
import { JSX } from "preact/jsx-runtime";
import { InsertImageDef } from "$islands/notes/insert-components/InsertImage.tsx";
import { InsertFileDef } from "$islands/notes/insert-components/InsertFile.tsx";
import { InsertNoteListDef } from "./insert-components/InsertNoteList.tsx";
import { InsertNoteLinkDef } from "$islands/notes/insert-components/InsertNoteLink.tsx";
import { useEffect } from "preact/hooks";
import { InsertTocDef } from "$islands/notes/insert-components/InsertToc.tsx";
import Picker, { PickerMap } from "$components/Picker.tsx";
import DropdownMenu from "$islands/DropdownMenu.tsx";

interface InsertDialogProps {
    noteText: string;
    onInsert: (text: string) => void;
}

export interface InsertComponentProps<T = object> {
    noteText: string;
    onInsertDataChange: (data: T | null) => void;
}

export interface InsertButton<T = object> {
    name: string;
    icon: string;
    formatData: (data: T) => string;
}

export interface InsertComponent<
    T,
    InsertKeys extends string,
    InsertData = object,
> {
    id: T;
    name: string;
    icon: string;
    description: string;
    insertButtons: { [K in InsertKeys]: InsertButton<InsertData> };
    component: (props: InsertComponentProps) => JSX.Element;
}

type ComponentId<T extends { id: string }> = T["id"];

const insertComponents = [
    InsertLinkDef,
    InsertImageDef,
    InsertFileDef,
    InsertNoteListDef,
    InsertNoteLinkDef,
    InsertTocDef,
];

const getComponentDef = (
    id: InsertComponentIds,
): (typeof insertComponents)[number] => {
    return insertComponents.find((c) => c.id === id)!;
};

type ReturnedComponent = ReturnType<typeof getComponentDef>;
type InsertComponentIds =
    | ComponentId<typeof InsertLinkDef>
    | ComponentId<typeof InsertImageDef>
    | ComponentId<typeof InsertFileDef>
    | ComponentId<typeof InsertNoteListDef>
    | ComponentId<typeof InsertNoteLinkDef>
    | ComponentId<typeof InsertTocDef>;

const componentsMap: PickerMap<InsertComponentIds, InsertComponentProps> =
    insertComponents.reduce((map, def) => {
        const Component = def.component as (
            props: InsertComponentProps,
        ) => JSX.Element;
        map[def.id] = (props) => <Component {...props} />;
        return map;
    }, {} as PickerMap<InsertComponentIds, InsertComponentProps>);

const InsertButton = (
    props: {
        component: ReturnedComponent;
        onInsert: (key: keyof ReturnedComponent["insertButtons"]) => void;
    },
) => {
    const insertButtonList = Object.entries(
        props.component.insertButtons,
    ) as [keyof ReturnedComponent["insertButtons"], ReturnedComponent][];

    if (insertButtonList.length === 1) {
        const [firstButtonKey, firstButton] = insertButtonList[0];

        return (
            <Button
                color="success"
                onClick={() =>
                    props.onInsert(
                        firstButtonKey,
                    )}
            >
                <Icon name={firstButton.icon} /> {firstButton.name}
            </Button>
        );
    }

    return (
        <DropdownMenu
            items={insertButtonList.map(([key, button]) => ({
                name: button.name,
                icon: button.icon,
                onClick: () => props.onInsert(key),
            }))}
            label={
                <>
                    <Icon name="list-ul" /> Insert As
                </>
            }
            inlineDirection="top"
            popoverId="insertDialog-0"
        />
    );
};

export default function InsertDialog({
    noteText,
    onInsert,
}: InsertDialogProps) {
    const selectedComponent = useSignal<InsertComponentIds>("link");
    const insertData = useSignal<object | null>(null);
    const showDialog = useSignal(false);

    const componentDef = getComponentDef(selectedComponent.value);

    const handleSelectComponent = (id: InsertComponentIds) => {
        insertData.value = null;
        selectedComponent.value = id;
    };

    const handleCancel = () => {
        showDialog.value = false;
    };

    const handleInsert = (
        action: keyof (typeof componentDef)["insertButtons"],
    ) => {
        const button = componentDef.insertButtons[action] as InsertButton;

        onInsert(button.formatData(insertData.value!));
        showDialog.value = false;
    };

    const handleOpenInsertDialog = () => {
        showDialog.value = true;
        insertData.value = null;
        selectedComponent.value = "link";
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "i") {
                handleOpenInsertDialog();
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
                onClick={handleOpenInsertDialog}
            >
                <Icon name="plus" />
            </Button>
            {showDialog.value && (
                <Dialog
                    visible={true}
                    canCancel={true}
                    onCancel={handleCancel}
                    props={{
                        class: "w-4/5",
                    }}
                    title="Insert"
                >
                    <div
                        class="relative"
                        style={{
                            height: "calc(100vh - 190px)",
                        }}
                    >
                        <div class="absolute top-0 left-0 bottom-14 right-3/4 border-r border-gray-700/50 py-4 overflow-auto">
                            {insertComponents.map((component) => (
                                <div
                                    class={`w-full mb-2 last:mb-0 p-2 rounded-tl-lg rounded-bl-lg hover:bg-gray-700/50 
                                        hover:border-gray-600/50 border-t border-l cursor-pointer ${
                                        component.id === selectedComponent.value
                                            ? "bg-sky-900 border-sky-600/50 pointer-events-none"
                                            : "border-transparent"
                                    }`}
                                    onClick={() =>
                                        handleSelectComponent(component.id)}
                                >
                                    <h1 class="text-lg font-semibold">
                                        <Icon name={component.icon} />{" "}
                                        {component.name}
                                    </h1>
                                    <span class="block text-sm text-gray-400">
                                        {component.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div class="left-1/4 right-0 top-0 bottom-14 absolute pl-5 max-h-screen overflow-auto">
                            <Picker<InsertComponentIds, InsertComponentProps>
                                selector={selectedComponent.value}
                                propsGetter={() => ({
                                    noteText,
                                    onInsertDataChange: (data) =>
                                        insertData.value = data,
                                })}
                                map={componentsMap}
                            />
                        </div>
                        <div class="absolute bottom-0 right-0">
                            {insertData.value && (
                                <InsertButton
                                    onInsert={handleInsert}
                                    component={componentDef}
                                />
                            )}

                            <Button
                                addClass="ml-2"
                                color="danger"
                                onClick={handleCancel}
                            >
                                <Icon name="minus-circle" /> Cancel
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
