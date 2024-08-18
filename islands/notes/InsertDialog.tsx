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
import DropdownMenu from "$islands/DropdownMenu.tsx";
import SideTabPanel, { PanelItem } from "$islands/SideTabPanel.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { InsertTableDef } from "$islands/notes/insert-components/InsertTable.tsx";
import { InsertHeadingDef } from "$islands/notes/insert-components/InsertHeading.tsx";
import { HotkeySet } from "$frontend/hotkeys.ts";

export const insertDialogHotkeySet: HotkeySet<
    "insertDialog",
    "openInsertDialog"
> = {
    context: "insertDialog",
    items: [
        {
            identifier: "openInsertDialog",
            metaKeys: ["ctrl"],
            key: "q",
            description: "Open insert dialog",
        },
    ],
};

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
    T extends string,
    InsertKeys extends string = string,
    InsertData = object,
> {
    id: T;
    name: string;
    icon: string;
    description: string;
    insertButtons: { [K in InsertKeys]: InsertButton<InsertData> };
    component: (props: InsertComponentProps) => JSX.Element;
}

const insertComponents = [
    InsertHeadingDef,
    InsertLinkDef,
    InsertImageDef,
    InsertTableDef,
    InsertFileDef,
    InsertNoteListDef,
    InsertNoteLinkDef,
    InsertTocDef,
];

type Component = typeof insertComponents[number];

const InsertButton = (
    props: {
        component: Component;
        onInsert: (key: keyof Component["insertButtons"]) => void;
    },
) => {
    const insertButtonList = Object.entries(
        props.component.insertButtons,
    ) as [keyof Component["insertButtons"], Component][];

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

const panelItems = insertComponents.map((component) => ({
    name: component.name,
    subtitle: component.description,
    icon: component.icon,
    data: component,
    component: component.component,
} as PanelItem<Component>));

export default function InsertDialog({
    noteText,
    onInsert,
}: InsertDialogProps) {
    const insertData = useSignal<object | null>(null);
    const showDialog = useSignal(false);

    const selectedPanel = useSelected<number>(0);

    const handleSelectComponent = (
        _panelItem: PanelItem<Component>,
        index: number,
    ) => {
        insertData.value = null;
        selectedPanel.select(index);
    };

    const handleCancel = () => {
        showDialog.value = false;
    };

    const handleInsert = (
        action: keyof Component["insertButtons"],
    ) => {
        const item = panelItems[selectedPanel.selected.value!].data!;

        const button = item.insertButtons[action] as InsertButton;

        onInsert(button.formatData(insertData.value!));
        showDialog.value = false;
    };

    const handleOpenInsertDialog = () => {
        showDialog.value = true;
        insertData.value = null;
        selectedPanel.select(0);
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "q") {
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
                    <SideTabPanel<Component, InsertComponentProps>
                        selectedIndex={selectedPanel.selected.value ?? 0}
                        items={panelItems}
                        onSelect={handleSelectComponent}
                        styleProps={{
                            height: "calc(100vh - 190px)",
                        }}
                        passProps={{
                            noteText,
                            onInsertDataChange: (data) =>
                                insertData.value = data,
                        }}
                    />

                    <div class="relative">
                        <div class="absolute bottom-0 right-0">
                            {insertData.value && (
                                <InsertButton
                                    onInsert={handleInsert}
                                    component={panelItems[
                                        selectedPanel.selected.value!
                                    ].data!}
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
