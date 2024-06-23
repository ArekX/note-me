import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";

interface HelpProps {
    onClose: () => void;
}

export default function NoteHelp({ onClose }: HelpProps) {
    return (
        <Dialog visible={true} canCancel={true} onCancel={onClose}>
            <table>
                <tr>
                    <td>
                        <h1 class="text-2xl pb-4">Help</h1>
                        <p class="pt-2 pb-2">
                            Welcome to the Notes app! This app allows you to
                            create, edit, and share notes with others.
                        </p>
                        <p class="pt-2 pb-2">
                            To get started, click on the "New Note" button in
                            the top right corner of the screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To edit an existing note, click on the "Edit" button
                            in the top right corner of the screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To view the details of a note, click on the
                            "Details" button in the top right corner of the
                            screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To view the history of a note, click on the
                            "History" button in the top right corner of the
                            screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To share a note with others, click on the "Share"
                            button in the top right corner of the screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To set a reminder for a note, click on the "Remind"
                            button in the top right corner of the screen.
                        </p>
                        <p class="pt-2 pb-2">
                            To delete a note, click on the "Delete" button in
                            the top right corner of the screen.
                        </p>
                    </td>
                </tr>
            </table>
            <div class="pt-4">
                <Button onClick={onClose} color="success">
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
