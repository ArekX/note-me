import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Loader from "$islands/Loader.tsx";
import { NoteDetailsRecord } from "$backend/repository/note-repository.ts";
import Button from "$components/Button.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useEffect } from "preact/hooks";
import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";

interface NoteDetailsProps {
    noteId: number;
    onClose: () => void;
}

export default function NoteDetails(
    { noteId, onClose }: NoteDetailsProps,
) {
    const noteData = useSignal<NoteDetailsRecord | null>(null);

    const isNoteLoading = useLoader(true);

    const timeFormatter = useTimeFormat();

    const { sendMessage } = useWebsocketService();

    const loadNoteData = async () => {
        isNoteLoading.start();

        const response = await sendMessage<
            GetNoteDetailsMessage,
            GetNoteDetailsResponse
        >("notes", "getNoteDetails", {
            data: {
                id: noteId,
            },
            expect: "getNoteDetailsResponse",
        });

        noteData.value = response.record;
        isNoteLoading.stop();
    };

    useEffect(() => {
        loadNoteData();
    }, [noteId]);

    const { group_name, created_at, updated_at, user_name } = noteData.value ??
        {};
    return (
        <Dialog visible={true}>
            {isNoteLoading.running
                ? <Loader color="white">Loading note details...</Loader>
                : noteData.value && (
                    <div>
                        <h1 class="text-2xl pb-4">Note Details</h1>

                        <h2 class="text-xl">General</h2>

                        <p class="pt-2 pb-2">
                            {group_name && (
                                <>
                                    <strong>Group:</strong> {group_name}
                                    <br />
                                </>
                            )}

                            <strong>Created at:</strong>{" "}
                            {timeFormatter.formatDateTime(created_at ?? 0)}{" "}
                            <br />
                            <strong>Last update at:</strong>{" "}
                            {timeFormatter.formatDateTime(updated_at ?? 0)}{" "}
                            <br />
                            <strong>Created by:</strong> {user_name}
                        </p>

                        <h2 class="text-xl">Table of Contents</h2>

                        <p>
                            <TableOfContents
                                text={noteData.value.note}
                                disableLinks={true}
                            />
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
}
