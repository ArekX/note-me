import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import ViewNote from "$islands/notes/ViewNote.tsx";

interface ViewNoteProps {
    note: ViewNoteRecord;
}

export default function ViewNotePage({ note }: ViewNoteProps) {
    return (
        <LockedContentWrapper
            inputRecords={[note]}
            protectedKeys={["note"]}
            isLockedKey={"is_encrypted"}
            unlockRender={([note]) => (
                <ViewNote
                    record={note}
                />
            )}
        />
    );
}
