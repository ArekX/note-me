import OnboardingDialog from "$islands/onboarding/OnboardingDialog.tsx";
import HelpAction from "$islands/help/HelpAction.tsx";
import Icon from "$components/Icon.tsx";

export default function ViewNoteIntroduction() {
    return (
        <OnboardingDialog
            title="Viewing your notes"
            onboardingKey="view_note_introduction_dismissed"
            content={({ onClosed }) => (
                <div>
                    <p>
                        This is a view page for your note. Here you can see your
                        note rendered from the{" "}
                        <HelpAction
                            action="open-markdown-syntax"
                            onOpened={onClosed}
                        >
                            markdown syntax
                        </HelpAction>.
                    </p>

                    <h1>Searching</h1>

                    <p>
                        If your note contains tags, you can click on the tag to
                        find all notes with the same tag in the sidebar on the
                        left.
                    </p>

                    <p>
                        If your note is organized in a group, group name will
                        appear below the note title. You can click on the group
                        name to search all notes in that group or it subgroups.
                    </p>

                    <h1>Sharing</h1>

                    <p>
                        Notes can be shared with other users or everyone by
                        creating a public link. Check{" "}
                        <HelpAction
                            onOpened={onClosed}
                            action="open-sharing-notes"
                        >
                            note sharing
                        </HelpAction>{" "}
                        in help for more information.
                    </p>

                    <h1>Reminders</h1>

                    <p>
                        If you need to be reminded about this note later, you
                        can set a one-time or recurring reminder. Check{" "}
                        <HelpAction
                            onOpened={onClosed}
                            action="open-setting-reminders"
                        >
                            setting reminders
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
