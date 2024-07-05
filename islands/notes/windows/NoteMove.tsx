import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Dialog from "$islands/Dialog.tsx";

export default function NoteMove({
    onClose,
}: NoteWindowComponentProps) {
    return (
        <Dialog
            canCancel={true}
            onCancel={onClose}
        >
            <div>
                <div class="p-2">
                    TODO: Waiting for search to be complete
                </div>

                <Button onClick={onClose} color="danger">Close</Button>
            </div>
        </Dialog>
    );
}
