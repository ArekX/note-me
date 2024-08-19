import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import SideTabPanel from "$islands/SideTabPanel.tsx";
import KeyboardShortcuts from "$islands/notes/windows/help/KeyboardShortcuts.tsx";

interface HelpProps {
    onClose: () => void;
}

export default function NoteHelp({ onClose }: HelpProps) {
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
            <div class="p-2">
                <SideTabPanel
                    selectedIndex={0}
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
                    styleProps={{
                        height: "calc(100vh - 208px)",
                    }}
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
