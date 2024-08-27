import OnboardingDialog from "$islands/onboarding/OnboardingDialog.tsx";

export default function EditNoteIntroduction() {
    return (
        <OnboardingDialog
            title="Editing your notes"
            onboardingKey="edit_note_introduction_dismissed"
            content={() => (
                <div>
                    This is the note editor. Here you can edit the contents of
                    your note.

                    <h1>Markdown</h1>

                    <p>
                        All notes are rendered using markdown syntax. While it
                        is not strictly necessary to know Markdown to use NoteMe
                        and you can use it to write plain text notes, knowing
                        Markdown can help and allow you to take a full advantage
                        of NoteMe's features. Check the help window in the upper
                        right menu of this page to see all supported markdown.
                    </p>

                    <h1>Seeing how your changes look</h1>

                    <p>
                        You can preview your changes by clickin on the preview
                        mode button in the top right corner or by pressing the
                        ctrl+e combination.
                    </p>

                    <h1>Inserting content</h1>

                    <p>
                        Some items can be inserted into the note by using the
                        insert menu. Menu can be opened by clicking on the
                        insert button in the bottom left corner or by pressing
                        the ctrl+q combination.
                    </p>

                    <h1>Files</h1>

                    <p>
                        NoteMe supports adding files to the notes which can be
                        shown as images or used as links to download the file.
                        Files can be added by using the insert menu, dropping
                        them into text area or by pasting them from clipboard.
                    </p>

                    <h1>Doing things faster</h1>

                    <p>
                        NoteMe has a number of keyboard shortcuts to help you
                        work faster to insert bold text, add templates and more.
                        Visit help for the full list of shortcuts.
                    </p>
                </div>
            )}
        />
    );
}
