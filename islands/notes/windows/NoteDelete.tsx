import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import { clearStorage } from "$frontend/session-storage.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteNoteMessage,
    DeleteNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";

interface NoteDeleteProps {
    noteId: number;
    show: boolean;
    onClose: () => void;
}

export const NoteDelete = ({ noteId, show, onClose }: NoteDeleteProps) => {
    const deleteLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const handleConfirmedDelete = async () => {
        deleteLoader.start();
        await sendMessage<DeleteNoteMessage, DeleteNoteResponse>(
            "notes",
            "deleteNote",
            {
                data: {
                    id: noteId,
                },
                expect: "deleteNoteResponse",
            },
        );
        deleteLoader.stop();
        clearStorage(); // TODO: Remove this when we have a better way to handle this
        redirectTo.root();
    };

    return (
        <ConfirmDialog
            prompt={deleteLoader.running
                ? <Loader color="white">Deleting note...</Loader>
                : (
                    <>
                        <div>Are you sure you want to delete this note?</div>
                        <div>
                            <strong>Important:</strong>{" "}
                            Deleted notes cannot be recovered and will no longer
                            be accessible to you or anyone else.
                        </div>
                    </>
                )}
            isProcessing={deleteLoader.running}
            confirmText="Delete note"
            confirmColor="danger"
            visible={show}
            onCancel={onClose}
            onConfirm={handleConfirmedDelete}
        />
    );
};
