import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import NoteEditor from "$islands/notes/NoteEditor.tsx";

interface EditNoteProps {
    note: ViewNoteRecord;
}

export default function EditNotePage({ note }: EditNoteProps) {
    return (
        <LockedContentWrapper
            inputRecords={[note]}
            protectedKeys={["note"]}
            isLockedKey={"is_encrypted"}
            unlockRender={([note]) => {
                return <NoteEditor note={note} />;
            }}
        />
    );
}
