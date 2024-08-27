import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import NoteEditor from "$islands/notes/NoteEditor.tsx";
import NotePage from "$islands/notes/pages/NotePage.tsx";
import EditNoteIntroduction from "$islands/onboarding/content/EditNoteIntroduction.tsx";

interface EditNoteProps {
    note: ViewNoteRecord;
}

export default function EditNotePage({ note }: EditNoteProps) {
    return (
        <NotePage
            note={note}
            component={({ record }) => (
                <>
                    <EditNoteIntroduction />
                    <NoteEditor
                        note={record}
                    />
                </>
            )}
        />
    );
}
