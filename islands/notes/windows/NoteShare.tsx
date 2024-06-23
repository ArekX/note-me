import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";

type ShareType = "users" | "everyone";

export default function NoteShare({
    onClose,
}: NoteWindowComponentProps) {
    const shareType = useSignal<ShareType>("users");

    return (
        <Dialog
            visible={true}
            onCancel={onClose}
            canCancel={true}
            props={{ "class": "w-2/4" }}
        >
            <h1 class="text-2xl pb-4">Share Note</h1>

            <div class="pb-4">
                Share status: <strong>Private</strong>
            </div>

            <div>
                <Button
                    color={shareType.value == "users" ? "success" : "primary"}
                    onClick={() => shareType.value = "users"}
                >
                    To Users
                </Button>
                <Button
                    color={shareType.value == "everyone"
                        ? "success"
                        : "primary"}
                    addClass="ml-2"
                    onClick={() => shareType.value = "everyone"}
                >
                    To Everyone
                </Button>
            </div>

            <div class="pt-4 pb-4">
                {shareType.value == "users" ? <div>Users</div> : (
                    <div>
                        Notes shared with everyone can be viewed by anyone.

                        <div class="pt-4">
                            <Button color="primary">Generate share link</Button>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <Button color="danger" onClick={onClose}>Close</Button>
            </div>
        </Dialog>
    );
}
