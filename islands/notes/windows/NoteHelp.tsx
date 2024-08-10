import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";

interface HelpProps {
    onClose: () => void;
}

export default function NoteHelp({ onClose }: HelpProps) {
    return (
        <Dialog visible={true} canCancel={true} onCancel={onClose} title="Help">
            <div class="p-2">
                TODO: Will be done last.
            </div>
            <div class="pt-4">
                <Button onClick={onClose} color="success">
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
