import OnboardingWrapper from "$islands/onboarding/OnboardingWrapper.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Icon from "$components/Icon.tsx";

export default function DashboardIntroduction() {
    return (
        <OnboardingWrapper
            onboardingKey="introduction_dismissed"
            className="text-lg round-lg border-2 border-gray-700 p-4 mt-4"
            content={() => (
                <>
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
                </>
            )}
        />
    );
}
