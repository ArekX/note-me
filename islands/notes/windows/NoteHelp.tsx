import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import SideTabPanel from "$islands/SideTabPanel.tsx";
import KeyboardShortcutsPage from "./help/KeyboardShortcutsPage.tsx";
import Icon from "$components/Icon.tsx";

import MarkdownSyntaxPage from "./help/MarkdownSyntaxPage.tsx";
import SupportedLanguageHighlightsPage from "./help/SupportedLanguageHighlightsPage.tsx";
import General from "./help/General.tsx";
import NoteFilesPage from "./help/NoteFilesPage.tsx";
import OrganizingNotesPage from "./help/OrganizingNotesPage.tsx";
import SettingRemindersPage from "./help/SettingRemindersPage.tsx";
import NoteHistoryPage from "./help/NoteHistoryPage.tsx";
import SearchingNotesPage from "./help/SearchingNotesPage.tsx";
import ProtectingNotesPage from "./help/ProtectingNotesPage.tsx";
import SharingNotesPage from "./help/SharingNotesPage.tsx";
import DeletingNotesPage from "./help/DeletingNotesPage.tsx";
import EditingNotesPage from "./help/EditingNotesPage.tsx";

import { useSignal } from "@preact/signals";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

interface HelpProps {
    onClose: () => void;
}

export type NoteHelpAction = "open-languages" | "open-markdown-syntax";

export default function NoteHelp({ onClose }: HelpProps) {
    const isMobileSidePanelOpen = useSignal(false);
    const query = useResponsiveQuery();

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
            name: "Setting reminders",
            component: () => <SettingRemindersPage />,
        },
        {
            name: "Protecting notes",
            component: () => <ProtectingNotesPage />,
        },
        {
            name: "Note history",
            component: () => <NoteHistoryPage />,
        },
        {
            name: "Searching notes",
            component: () => <SearchingNotesPage />,
        },
        {
            name: "Editing notes",
            component: () => <EditingNotesPage />,
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
        }
    };

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={onClose}
            title="Help"
            props={{
                class: "w-full",
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
                <Button onClick={onClose} color="primary">
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
