import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteNoteMessage,
    DeleteNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";

interface NoteDeleteProps {
    noteId: number;
    onClose: () => void;
}

export default function NoteDelete({ noteId, onClose }: NoteDeleteProps) {
    const deleteLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const handleConfirmedDelete = deleteLoader.wrap(() =>
        sendMessage<DeleteNoteMessage, DeleteNoteResponse>(
            "notes",
            "deleteNote",
            {
                data: {
                    id: noteId,
                },
                expect: "deleteNoteResponse",
            },
        )
    );

    return (
        <ConfirmDialog
            prompt={deleteLoader.running
                ? <Loader color="white">Deleting note...</Loader>
                : (
                    <>
                        <div>Are you sure you want to delete this note?</div>
                        <div class="py-2">
                            <strong>Important:</strong>{" "}
                            Deleted notes can still be recovered for the next 30
                            days from the time they are deleted.
                        </div>
                    </>
                )}
            isProcessing={deleteLoader.running}
            confirmText="Delete note"
            confirmColor="danger"
            visible
            onCancel={onClose}
            onConfirm={handleConfirmedDelete}
        />
    );
}
