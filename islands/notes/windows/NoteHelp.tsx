import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import SideTabPanel from "$islands/SideTabPanel.tsx";
import KeyboardShortcuts from "$islands/notes/windows/help/KeyboardShortcuts.tsx";
import { useSignal } from "@preact/signals";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Icon from "$components/Icon.tsx";
import MarkdownSyntax, {
    MarkdownSyntaxActions,
} from "$islands/notes/windows/help/MarkdownSyntax.tsx";
import SupportedLanguageHighlights from "$islands/notes/windows/help/SupportedLanguageHighlights.tsx";

interface HelpProps {
    onClose: () => void;
}

export default function NoteHelp({ onClose }: HelpProps) {
    const isMobileSidePanelOpen = useSignal(false);
    const query = useResponsiveQuery();

    const itemIndex = useSignal(0);

    const handleTopicAction = (action: MarkdownSyntaxActions) => {
        switch (action) {
            case "open-languages":
                itemIndex.value = 3;
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
                    items={[
                        {
                            name: "General",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        General
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Organizing notes",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Organizing notes - groups, tags
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Editing notes",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Editing notes
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Sharing notes",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Sharing notes
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Note history",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Note history
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Note protection",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Note protection
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Setting reminders",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Setting reminders
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Deleting notes",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Note deletion
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Inserting content",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Inserting content
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Files",
                            component: () => (
                                <div class="p-2">
                                    <p>
                                        Files
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Keyboard Shortcuts",
                            component: () => <KeyboardShortcuts />,
                        },
                        {
                            name: "Markdown Syntax",
                            component: () => (
                                <MarkdownSyntax onAction={handleTopicAction} />
                            ),
                        },
                        {
                            name: "Supported languages in code blocks",
                            component: () => <SupportedLanguageHighlights />,
                        },
                    ]}
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
