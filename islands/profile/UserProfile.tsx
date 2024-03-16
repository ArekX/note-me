import { useSignal } from "@preact/signals";
import { UserProfile } from "$schemas/users.ts";
import { Input } from "$components/Input.tsx";
import { Button } from "$components/Button.tsx";
import { updateProfile } from "$frontend/api.ts";
import { DropdownList } from "$components/DropdownList.tsx";

interface UserProfileProps {
    initialProfileData: UserProfile;
}

const availableTimezones = Intl.supportedValuesOf("timeZone")
    .map((zone) => ({
        label: zone.replace(/\//g, " - ").replace(/\_/g, " "),
        value: zone,
    }));

export function UserProfile({ initialProfileData }: UserProfileProps) {
    const userData = useSignal<UserProfile>({
        ...initialProfileData,
    });

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        await updateProfile(userData.value);
    };

    const handlePropertyChange =
        (propertyName: keyof UserProfile) => (value: string) => {
            userData.value = {
                ...userData.value,
                [propertyName]: value,
            };
        };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Name"
                    type="text"
                    value={userData.value.name}
                    onInput={handlePropertyChange("name")}
                />
                <br />
                <DropdownList
                    label="Timezone"
                    items={availableTimezones}
                    value={userData.value.timezone}
                    onInput={handlePropertyChange("timezone")}
                />
                <br />
                <Input
                    label="Old Password"
                    type="password"
                    value={userData.value.old_password}
                    onInput={handlePropertyChange("old_password")}
                />
                <br />
                <Input
                    label="New Password"
                    type="password"
                    value={userData.value.new_password}
                    onInput={handlePropertyChange("new_password")}
                />
                <br />
                <Input
                    label="Confirm Password"
                    type="password"
                    value={userData.value.confirm_password}
                    onInput={handlePropertyChange("confirm_password")}
                />
                <br />
                <Button type="submit" color="primary">Submit</Button>
            </form>
        </div>
    );
}
