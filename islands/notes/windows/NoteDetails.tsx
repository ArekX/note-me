import Dialog from "$islands/Dialog.tsx";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useLoading } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import { getNoteDetails } from "$frontend/api.ts";
import { NoteDetailsRecord } from "$backend/repository/note-repository.ts";
import { getUserData } from "$frontend/user-data.ts";
import { Button } from "$components/Button.tsx";
import { unixToDate } from "$frontend/time.ts";

interface NoteDetailsProps {
    show: boolean;
    noteId: number;
    onClose: () => void;
}

export const NoteDetails = ({ show, noteId, onClose }: NoteDetailsProps) => {
    const noteData = useSignal<NoteDetailsRecord | null>(null);

    const isNoteLoading = useLoading();

    const loadNoteDetails = async () => {
        if (isNoteLoading.value) {
            return;
        }

        isNoteLoading.start();

        const { data } = await getNoteDetails(noteId);
        noteData.value = data;
        isNoteLoading.stop();
    };

    useEffect(() => {
        if (show && !noteData.value) {
            loadNoteDetails();
        }
    }, [show]);

    const userData = getUserData();

    const { group_name, created_at, updated_at, user_name } = noteData.value ??
        {};
    return (
        <Dialog visible={show}>
            {isNoteLoading.value
                ? <Loader color="white">Loading note details...</Loader>
                : noteData.value && (
                    <div>
                        <h1 class="text-2xl pb-4">Note Details</h1>

                        <p class="pt-2 pb-2">
                            {group_name && (
                                <>
                                    <strong>Group:</strong> {group_name}
                                    <br />
                                </>
                            )}

                            <strong>Created at:</strong>{" "}
                            {userData.formatDateTime(created_at ?? 0)} <br />
                            <strong>Last update at:</strong>{" "}
                            {userData.formatDateTime(updated_at ?? 0)} <br />
                            <strong>Created by:</strong> {user_name}
                        </p>
                        <div class="pt-4">
                            <Button onClick={onClose} color="success">
                                Close
                            </Button>
                        </div>
                    </div>
                )}
        </Dialog>
    );
};
