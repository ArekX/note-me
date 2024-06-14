import UserProfile from "$islands/profile/UserProfile.tsx";
import { AppState } from "$types";
import { PageProps } from "$fresh/server.ts";

export default function Page({ state }: PageProps<never, AppState>) {
    const initialData = {
        name: state.session?.data.user?.name ?? "",
        timezone: state.session?.data.user?.timezone ?? "",
    };

    return <UserProfile initialProfileData={initialData} />;
}
