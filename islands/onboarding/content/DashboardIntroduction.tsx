import { redirectTo } from "$frontend/redirection-manager.ts";
import Icon from "$components/Icon.tsx";
import OnboardingDialog from "$islands/onboarding/OnboardingDialog.tsx";
import HelpAction from "$islands/help/HelpAction.tsx";

export default function DashboardIntroduction() {
    return (
        <OnboardingDialog
            onboardingKey="introduction_dismissed"
            title="Welcome to NoteMe!"
            content={({ onClosed }) => (
                <div>
                    <p>
                        NoteMe is a simple, note-taking app with powerful
                        features which help to keep the ownership of your notes
                        and keep them organized however you see fit.
                    </p>

                    <p>
                        Notes are shown in the sidebar on the left, clicking on
                        a specific note will open it in view mode where you can
                        see its contents. On the same sidebar you can also
                        organize notes by dragging them into groups or
                        subgroups.
                    </p>

                    <p>
                        This page shows general information about your notes
                        like what notes you have recently opened, notes you have
                        upcoming reminders for and notes shared with you.
                    </p>

                    <p>
                        You can see your profile information by clicking on your
                        profile icon in the top left corner of the sidebar. From
                        there you can access your settings, data and other
                        information.
                    </p>

                    <p>
                        For more help, click on the{" "}
                        <HelpAction onOpened={onClosed} disableUnderline>
                            <Icon name="help-circle" />
                        </HelpAction>{" "}
                        in the left sidebar menu.
                    </p>

                    <p>
                        Add your first note by clicking on the{" "}
                        <a
                            onClick={() => redirectTo.newNote()}
                            class="cursor-pointer"
                        >
                            <Icon name="plus" size="4xl" />
                        </a>{" "}
                        icon in the list on the left.
                    </p>

                    <p>
                        Have fun using NoteMe!
                    </p>
                </div>
            )}
        />
    );
}
