import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import SideTabPanel from "$islands/SideTabPanel.tsx";
import KeyboardShortcuts from "$islands/notes/windows/help/KeyboardShortcuts.tsx";
import { useSignal } from "@preact/signals";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Icon from "$components/Icon.tsx";

interface HelpProps {
    onClose: () => void;
}

export default function NoteHelp({ onClose }: HelpProps) {
    const isMobileSidePanelOpen = useSignal(false);
    const query = useResponsiveQuery();

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={onClose}
            title="Help"
            props={{
                class: "w-4/5",
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
                    selectedIndex={0}
                    isMobileSidePanelOpen={isMobileSidePanelOpen.value}
                    onSelect={() => {
                        isMobileSidePanelOpen.value = false;
                    }}
                    items={[
                        {
                            name: "Help",
                            component: () => (
                                <div class="p-2">
                                    <h2 class="text-lg font-bold">Help</h2>
                                    <p class="pt-2">
                                        This is the help dialog.
                                    </p>
                                </div>
                            ),
                        },
                        {
                            name: "Keyboard Shortcuts",
                            component: () => <KeyboardShortcuts />,
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
