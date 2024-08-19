import Icon from "$components/Icon.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import RecentlyOpenedNotes from "$islands/dashboard/RecentlyOpenedNotes.tsx";
import Button from "$components/Button.tsx";
import CurrentReminders from "./CurrentReminders.tsx";
import RecentlySharedWithMe from "$islands/dashboard/RecentlySharedWithMe.tsx";
import PassedReminders from "$islands/dashboard/PassedReminders.tsx";

export default function Dashboard() {
    const user = useUser();

    const {
        introduction_dismissed = false,
    } = user.getOnboardingState();

    const handleDismissIntroduction = () => {
        user.updateOnboardingState({
            introduction_dismissed: true,
        });
    };

    return (
        <>
            <h2 class="text-4xl">
                Welcome, {user.getName()}!
            </h2>
            {!introduction_dismissed && (
                <div className="text-lg round-lg border-2 border-gray-700 p-4 mt-4">
                    <p class="text-lg">
                        NoteMe is a simple note-taking app with powerful
                        features which help to to keep your notes organized.
                        With NoteMe, you can create, edit, and delete notes, and
                        organize them using tags.
                    </p>

                    <p class="mt-4">
                        Add your first note by clicking on the{" "}
                        <a
                            onClick={() => redirectTo.newNote()}
                            class="cursor-pointer"
                        >
                            <Icon name="plus" size="4xl" />
                        </a>{" "}
                        icon in the list on the left.
                    </p>

                    <div class="text-right">
                        <Button onClick={handleDismissIntroduction}>
                            Dismiss
                        </Button>
                    </div>
                </div>
            )}

            <div class="flex py-5 flex-wrap">
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full">
                    <RecentlyOpenedNotes />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full">
                    <CurrentReminders />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full">
                    <RecentlySharedWithMe />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full">
                    <PassedReminders />
                </div>
            </div>
        </>
    );
}
