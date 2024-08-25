import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import ViewNote from "$islands/notes/ViewNote.tsx";
import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import ViewNoteIntroduction from "$islands/onboarding/content/ViewNoteIntroduction.tsx";

interface ViewNoteProps {
    note: ViewNoteRecord;
}

const ViewNoteInternal = (props: { record: ViewNoteRecord }) => {
    return (
        <>
            <ViewNoteIntroduction />
            <ViewNote
                record={props.record}
            />
        </>
    );
};

export default function ViewNotePage({ note }: ViewNoteProps) {
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

    if (noteRecord.value.id !== note.id) {
        noteRecord.value = {
            ...note,
        };
    }

    if (!noteRecord.value.is_encrypted) {
        return <ViewNoteInternal record={noteRecord.value} />;
    }

    return (
        <LockedContentWrapper
            inputRecords={[noteRecord.value]}
            protectedKeys={["note"]}
            isLockedKey={"is_encrypted"}
            unlockRender={({ unlockedRecords: [note] }) => (
                <ViewNoteInternal record={note} />
            )}
        />
    );
}
