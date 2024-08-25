import { useUser } from "$frontend/hooks/use-user.ts";
import RecentlyOpenedNotes from "$islands/dashboard/RecentlyOpenedNotes.tsx";
import CurrentReminders from "./CurrentReminders.tsx";
import RecentlySharedWithMe from "$islands/dashboard/RecentlySharedWithMe.tsx";
import PassedReminders from "$islands/dashboard/PassedReminders.tsx";
import DashboardIntroduction from "$islands/onboarding/content/DashboardIntroduction.tsx";

export default function Dashboard() {
    const user = useUser();

    return (
        <>
            <h2 class="text-4xl">
                Welcome, {user.getName()}!
            </h2>
            <DashboardIntroduction />

            <div class="flex py-5 flex-wrap">
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full px-2 max-md:pb-7">
                    <RecentlyOpenedNotes />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full px-2 max-md:pb-7">
                    <CurrentReminders />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full px-2 max-md:pb-7">
                    <RecentlySharedWithMe />
                </div>
                <div class="lg:basis-1/3 md:max-lg:basis-1/2 basis-full px-2 max-md:pb-7">
                    <PassedReminders />
                </div>
            </div>
        </>
    );
}
