import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Dialog from "$islands/Dialog.tsx";

export default function NoteShare({
    onClose,
}: NoteWindowComponentProps) {
    return (
        <Dialog
            visible={true}
            onCancel={onClose}
            canCancel={true}
        >
            Share
            <div>
                <Button color="danger" onClick={onClose}>Close</Button>
            </div>
        </Dialog>
    );
}
