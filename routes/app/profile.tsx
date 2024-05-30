import Panel from "$components/Panel.tsx";
import UserProfile from "$islands/profile/UserProfile.tsx";
import { AppState } from "$types";
import { PageProps } from "$fresh/server.ts";
import FilePicker from "$islands/files/FilePicker.tsx";

export default function Page({ state }: PageProps<never, AppState>) {
    const initialData = {
        name: state.session?.data.user?.name ?? "",
        timezone: state.session?.data.user?.timezone ?? "",
    };

    return (
        <div>
            <Panel>
                <FilePicker />
            </Panel>
            <Panel>
                <UserProfile initialProfileData={initialData} />
            </Panel>
        </div>
    );
}
