import OnboardingDialog from "$islands/onboarding/OnboardingDialog.tsx";

export default function ViewNoteIntroduction() {
    return (
        <OnboardingDialog
            title="Viewing your notes"
            onboardingKey="view_note_introduction_dismissed"
            content={() => (
                <div>
                    Here you can see the contents of your note in view mode.
                    {" "}
                    <br />

                    <p>
                        All notes are rendered using{" "}
                        <a
                            href="https://en.wikipedia.org/wiki/Markdown"
                            target="_blank"
                        >
                            markdown syntax
                        </a>. While it is not strictly necessary to know
                        Markdown to use NoteMe and you can use it to write plain
                        text notes, knowing Markdown can help and allow you to
                        take a full advantage of NoteMe's features.
                    </p>

                    <p>
                        NoteMe supports all basic markdown features like
                        headers, lists, links, images, and code blocks. You can
                        also use advanced features like tables, footnotes, and
                        strikethrough text and some extensions specific to
                        NoteMe.
                    </p>

                    <p>
                        To see all supported markdown features, check the help
                        window in the upper right menu of this page.
                    </p>
                </div>
            )}
        />
    );
}
