import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import ViewNote from "$islands/notes/ViewNote.tsx";
import ViewNoteIntroduction from "$islands/onboarding/content/ViewNoteIntroduction.tsx";
import NotePage from "$islands/notes/pages/NotePage.tsx";

interface ViewNoteProps {
    note: ViewNoteRecord;
}

export default function ViewNotePage({ note }: ViewNoteProps) {
    return (
        <NotePage
            note={note}
            component={({ record }) => (
                <>
                    <ViewNoteIntroduction />
                    <ViewNote
                        record={record}
                    />
                </>
            )}
        />
    );
}
