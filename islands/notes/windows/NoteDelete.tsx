import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useLoading } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";

interface NoteDeleteProps {
    show: boolean;
    onClose: () => void;
}

export const NoteDelete = ({ show, onClose }: NoteDeleteProps) => {
    const deleteLoader = useLoading();
    const handleConfirmedDelete = () => {
        deleteLoader.start();
    };

    return (
        <ConfirmDialog
            prompt={deleteLoader.value
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
            isProcessing={deleteLoader.value}
            confirmText="Delete note"
            confirmColor="danger"
            visible={show}
            onCancel={onClose}
            onConfirm={handleConfirmedDelete}
        />
    );
};
