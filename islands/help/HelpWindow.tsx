import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import SideTabPanel from "$islands/SideTabPanel.tsx";
import KeyboardShortcutsPage from "./pages/KeyboardShortcutsPage.tsx";
import Icon from "$components/Icon.tsx";

import MarkdownSyntaxPage from "./pages/MarkdownSyntaxPage.tsx";
import SupportedLanguageHighlightsPage from "./pages/SupportedLanguageHighlightsPage.tsx";
import General from "./pages/GeneralPage.tsx";
import NoteFilesPage from "./pages/NoteFilesPage.tsx";
import OrganizingNotesPage from "./pages/OrganizingNotesPage.tsx";
import SettingRemindersPage from "./pages/SettingRemindersPage.tsx";
import NoteHistoryPage from "./pages/NoteHistoryPage.tsx";
import SearchingNotesPage from "./pages/SearchingNotesPage.tsx";
import ProtectingNotesPage from "./pages/ProtectingNotesPage.tsx";
import SharingNotesPage from "./pages/SharingNotesPage.tsx";
import DeletingNotesPage from "./pages/DeletingNotesPage.tsx";
import EditingNotesPage from "./pages/EditingNotesPage.tsx";

import { useSignal } from "@preact/signals";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import { useHelp } from "$frontend/hooks/use-help.ts";
import { useEffect } from "preact/hooks";

export type NoteHelpAction =
    | "open-languages"
    | "open-markdown-syntax"
    | "open-sharing-notes"
    | "open-keyboard-shortcuts"
    | "open-protecting-notes"
    | "open-setting-reminders"
    | "open-note-history";

export default function NoteHelp() {
    const isMobileSidePanelOpen = useSignal(false);
    const query = useResponsiveQuery();

    const help = useHelp();

    const itemIndex = useSignal(0);

    const panels = [
        {
            name: "General",
            component: () => <General onAction={handleTopicAction} />,
        },
        {
            name: "Organizing notes",
            component: () => <OrganizingNotesPage />,
        },
        {
            name: "Sharing notes",
            component: () => <SharingNotesPage />,
        },
        {
            id: "setting-reminders",
            name: "Setting reminders",
            component: () => <SettingRemindersPage />,
        },
        {
            key: "protecting-notes",
            name: "Protecting notes",
            component: () => <ProtectingNotesPage />,
        },
        {
            key: "note-history",
            name: "Note history",
            component: () => <NoteHistoryPage />,
        },
        {
            name: "Searching notes",
            component: () => <SearchingNotesPage />,
        },
        {
            name: "Editing notes",
            component: () => <EditingNotesPage onAction={handleTopicAction} />,
        },
        {
            name: "Deleting notes",
            component: () => <DeletingNotesPage />,
        },

        {
            name: "Files",
            component: () => <NoteFilesPage />,
        },
        {
            key: "keyboard-shortcuts",
            name: "Keyboard Shortcuts",
            component: () => <KeyboardShortcutsPage />,
        },
        {
            key: "markdown-syntax",
            name: "Markdown Syntax",
            component: () => (
                <MarkdownSyntaxPage
                    onAction={handleTopicAction}
                />
            ),
        },
        {
            key: "codeblock-languages",
            name: "Supported languages in code blocks",
            component: () => <SupportedLanguageHighlightsPage />,
        },
    ];

    const handleTopicAction = (action: NoteHelpAction) => {
        switch (action) {
            case "open-languages":
                itemIndex.value = panels.findIndex((p) =>
                    p.key === "codeblock-languages"
                );
                break;
            case "open-markdown-syntax":
                itemIndex.value = panels.findIndex((p) =>
                    p.key === "markdown-syntax"
                );
                break;

            case "open-sharing-notes":
                itemIndex.value = panels.findIndex((p) =>
                    p.name === "Sharing notes"
                );
                break;
            case "open-keyboard-shortcuts":
                itemIndex.value = panels.findIndex((p) =>
                    p.key === "keyboard-shortcuts"
                );
                break;
            case "open-protecting-notes":
                itemIndex.value = panels.findIndex((p) =>
                    p.key === "protecting-notes"
                );
                break;
            case "open-setting-reminders":
                itemIndex.value = panels.findIndex((p) =>
                    p.id === "setting-reminders"
                );
                break;
            case "open-note-history":
                itemIndex.value = panels.findIndex((p) =>
                    p.key === "note-history"
                );
                break;
        }
    };

    if (!help.isOpen.value) {
        return null;
    }

    useEffect(() => {
        if (help.isOpen.value && help.initialAction.value) {
            handleTopicAction(help.initialAction.value);
        }
    }, [help.isOpen.value]);

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={() => help.close()}
            title="Help"
            props={{
                class: "max-lg:w-full lg:w-3/4 xl:w-1/2",
            }}
        >
            {query.max("sm") && (
                <div class="text-right">
                    <Button
                        color="success"
                        onClick={() =>
                            isMobileSidePanelOpen.value = !isMobileSidePanelOpen
                                .value}
                    >
                        <Icon name="menu" size="sm" /> Topics
                    </Button>
                </div>
            )}
            <div class="py-2">
                <SideTabPanel
                    selectedIndex={itemIndex.value}
                    isMobileSidePanelOpen={isMobileSidePanelOpen.value}
                    onSelect={(_, index) => {
                        itemIndex.value = index;
                        isMobileSidePanelOpen.value = false;
                    }}
                    addPanelClass="onboarding-contents"
                    items={panels}
                    styleProps={query.min("md")
                        ? {
                            height: "calc(100vh - 208px)",
                        }
                        : { minHeight: "200px" }}
                />
            </div>
            <div class="text-right">
                <Button onClick={() => help.close()} color="primary">
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
