import OnboardingDialog from "$islands/onboarding/OnboardingDialog.tsx";
import HelpAction from "$islands/help/HelpAction.tsx";
import Icon from "$components/Icon.tsx";

export default function EditNoteIntroduction() {
    return (
        <OnboardingDialog
            title="Editing your notes"
            onboardingKey="edit_note_introduction_dismissed"
            content={({ onClosed }) => (
                <div>
                    This is the note editor. Here you can edit the contents of
                    your note.

                    <h1>Markdown</h1>

                    <p>
                        All notes are written using markdown syntax. While it is
                        not strictly necessary to know Markdown to use NoteMe
                        and you can use it to write plain text notes, knowing
                        Markdown can help and allow you to take a full advantage
                        of NoteMe's features. Check{" "}
                        <HelpAction
                            action="open-markdown-syntax"
                            onOpened={onClosed}
                        >
                            help to see all supported markdown features
                        </HelpAction>.
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
                        the ctrl+q key combination.
                    </p>

                    <h1>Doing things faster</h1>

                    <p>
                        NoteMe has a number of keyboard shortcuts to help you
                        work faster to insert bold text, add templates and more.
                        Visit help for the{" "}
                        <HelpAction
                            action="open-keyboard-shortcuts"
                            onOpened={onClosed}
                        >
                            full list of shortcuts
                        </HelpAction>.
                    </p>

                    <h1>Files</h1>

                    <p>
                        NoteMe supports adding files to the notes which can be
                        shown as images or used as links to download the file.
                        Files can be added by using the insert menu, dropping
                        them into text area or by pasting them from clipboard.
                    </p>

                    <h1>History</h1>

                    <p>
                        Every time a note is saved after creation, NoteMe
                        records the previous version of the note in the history.
                        Check{" "}
                        <HelpAction
                            action="open-note-history"
                            onOpened={onClosed}
                        >
                            note history
                        </HelpAction>{" "}
                        in help for more information.
                    </p>

                    <h1>Protecting your notes</h1>

                    <p>
                        Notes can be protected so that you are the only person
                        who has access to their content. Notes are encrypted in
                        the database with your password. Check{" "}
                        <HelpAction
                            action="open-protecting-notes"
                            onOpened={onClosed}
                        >
                            protecting notes
                        </HelpAction>{" "}
                        in help for more information.
                    </p>

                    <p>
                        For more help, click on the{" "}
                        <HelpAction onOpened={onClosed} disableUnderline>
                            <Icon name="help-circle" />
                        </HelpAction>{" "}
                        in the left sidebar menu.
                    </p>
                </div>
            )}
        />
    );
}
