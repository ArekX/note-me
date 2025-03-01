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
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import { useHotkeys } from "$frontend/hooks/use-hotkeys.ts";

export const insertDialogHotkeySet: HotkeySet<
    "insertDialog",
    "openInsertDialog"
> = {
    context: "insertDialog",
    items: [
        {
            identifier: "openInsertDialog",
            metaKeys: ["alt"],
            key: "i",
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
    key: component.id,
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
    const { resolveHotkey } = useHotkeys("insertDialog");
    const insertData = useSignal<object | null>(null);
    const showDialog = useSignal(false);

    const selectedPanel = useSelected<number>(0);

    const isMobileSidePanelOpen = useSignal(false);

    const query = useResponsiveQuery();

    const handleSelectComponent = (
        _panelItem: PanelItem<Component>,
        index: number,
    ) => {
        insertData.value = null;
        selectedPanel.select(index);
        isMobileSidePanelOpen.value = false;
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
            const hotkey = resolveHotkey(e);

            if (hotkey) {
                if (hotkey === "openInsertDialog") {
                    handleOpenInsertDialog();
                }
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
                    visible
                    canCancel
                    onCancel={handleCancel}
                    props={{
                        class: "w-full xl:w-4/5 2xl:w-3/5",
                    }}
                    title="Insert"
                >
                    {query.isMobile() && (
                        <div class="text-right py-2">
                            <Button
                                color="success"
                                onClick={() =>
                                    isMobileSidePanelOpen.value =
                                        !isMobileSidePanelOpen.value}
                            >
                                <Icon name="menu" size="sm" /> Items
                            </Button>
                        </div>
                    )}
                    <SideTabPanel<Component, InsertComponentProps>
                        selectedIndex={selectedPanel.selected.value ?? 0}
                        items={panelItems}
                        isMobileSidePanelOpen={isMobileSidePanelOpen.value}
                        onSelect={handleSelectComponent}
                        styleProps={query.min("md")
                            ? {
                                height: "calc(100vh - 195px)",
                            }
                            : {
                                minHeight: "200px",
                            }}
                        passProps={{
                            noteText,
                            onInsertDataChange: (data) =>
                                insertData.value = data,
                        }}
                    />

                    <div class="pt-5 text-right">
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
                </Dialog>
            )}
        </div>
    );
}
