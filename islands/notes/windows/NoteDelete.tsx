import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import { deleteNote } from "$frontend/api.ts";
import { clearStorage } from "$frontend/session-storage.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";

interface NoteDeleteProps {
    noteId: number;
    show: boolean;
    onClose: () => void;
}

export const NoteDelete = ({ noteId, show, onClose }: NoteDeleteProps) => {
    const deleteLoader = useLoader();
    const handleConfirmedDelete = async () => {
        deleteLoader.start();
        await deleteNote(noteId);
        deleteLoader.stop();
        clearStorage();
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
