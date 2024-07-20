import { useSignal } from "@preact/signals";
import { EditUserProfile } from "$schemas/users.ts";
import Input from "$components/Input.tsx";
import Button from "$components/Button.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { supportedTimezoneList } from "$lib/time/time-zone.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import { addMessage } from "$frontend/toast-message.ts";

export default function UserProfile() {
    const user = useUser();
    const userData = useSignal<EditUserProfile>({
        name: user.getName(),
        timezone: user.getTimezone(),
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        await user.updateProfile(userData.value);
        addMessage({
            type: "success",
            text: "Profile updated successfully.",
        });
    };

    const handlePropertyChange =
        (propertyName: keyof EditUserProfile) => (value: string) => {
            userData.value = {
                ...userData.value,
                [propertyName]: value,
            };
        };

    return (
        <div class="text-black">
            <form onSubmit={handleSubmit}>
                <Input
                    label="Name"
                    labelColor="black"
                    type="text"
                    value={userData.value.name}
                    onInput={handlePropertyChange("name")}
                />
                <br />
                <DropdownList
                    label="Timezone"
                    labelColor="black"
                    items={supportedTimezoneList}
                    value={userData.value.timezone}
                    onInput={handlePropertyChange("timezone")}
                />
                <br />
                <Input
                    label="Old Password"
                    type="password"
                    labelColor="black"
                    value={userData.value.old_password}
                    onInput={handlePropertyChange("old_password")}
                />
                <br />
                <Input
                    label="New Password"
                    type="password"
                    labelColor="black"
                    value={userData.value.new_password}
                    onInput={handlePropertyChange("new_password")}
                />
                <br />
                <Input
                    label="Confirm Password"
                    type="password"
                    labelColor="black"
                    value={userData.value.confirm_password}
                    onInput={handlePropertyChange("confirm_password")}
                />
                <br />
                <Button type="submit" color="primary">Submit</Button>
            </form>
        </div>
    );
}
