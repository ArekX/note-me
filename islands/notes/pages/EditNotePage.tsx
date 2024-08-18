import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import NoteEditor from "$islands/notes/NoteEditor.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface EditNoteProps {
    note: ViewNoteRecord;
}

export default function EditNotePage({ note }: EditNoteProps) {
    const noteRecord = useSignal<ViewNoteRecord>(note);

    useEffect(() => {
        noteRecord.value = {
            ...note,
        };
    }, [note]);

    useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                revertNoteToHistoryResponse: (response) => {
                    if (response.note_id === note.id) {
                        noteRecord.value = {
                            ...noteRecord.value,
                            note: response.note,
                            title: response.title,
                            tags: response.tags,
                            is_encrypted: response.is_encrypted,
                        };
                    }
                },
            },
        },
    });

    return (
        <LockedContentWrapper
            inputRecords={[note]}
            protectedKeys={["note"]}
            isLockedKey={"is_encrypted"}
            unlockRender={({ unlockedRecords: [note] }) => {
                return <NoteEditor note={note} />;
            }}
        />
    );
}
