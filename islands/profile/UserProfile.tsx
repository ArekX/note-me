import { useSignal } from "@preact/signals";
import { EditUserProfile, userProfileSchema } from "$schemas/users.ts";
import Input from "$components/Input.tsx";
import Button from "$components/Button.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { supportedTimezoneList } from "$lib/time/time-zone.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import { addMessage } from "$frontend/toast-message.ts";
import { SystemErrorMessage } from "$frontend/hooks/use-websocket-service.ts";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";

export default function UserProfile() {
    const user = useUser();
    const userData = useSignal<EditUserProfile>({
        name: user.getName(),
        timezone: user.getTimezone(),
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [validation, validate] = useValidation<EditUserProfile>({
        schema: userProfileSchema,
    });

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        if (
            !await validate({
                ...userData.value,
                old_password: userData.value.old_password || undefined,
                new_password: userData.value.new_password || undefined,
                confirm_password: userData.value.confirm_password || undefined,
            })
        ) {
            return;
        }

        try {
            await user.updateProfile(userData.value);
            addMessage({
                type: "success",
                text: "Profile updated successfully.",
            });
        } catch (e) {
            const error = e as SystemErrorMessage;
            console.log(error);
            addMessage({
                type: "error",
                text: `Failed to update profile: ${error.data.message}`,
            });
        }
    };

    const handlePropertyChange =
        (propertyName: keyof EditUserProfile) => (value: string) => {
            userData.value = {
                ...userData.value,
                [propertyName]: value,
            };
        };

    return (
        <div>
            <h1 class="text-xl py-4 font-semibold">My Profile</h1>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Name"
                    type="text"
                    value={userData.value.name}
                    onInput={handlePropertyChange("name")}
                />
                <ErrorDisplay
                    state={validation}
                    path="name"
                />
                <br />
                <DropdownList
                    label="Timezone"
                    items={supportedTimezoneList}
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
                <ErrorDisplay
                    state={validation}
                    path="old_password"
                />
                <br />
                <Input
                    label="New Password"
                    type="password"
                    value={userData.value.new_password}
                    onInput={handlePropertyChange("new_password")}
                />
                <ErrorDisplay
                    state={validation}
                    path="new_password"
                />
                <br />
                <Input
                    label="Confirm Password"
                    type="password"
                    value={userData.value.confirm_password}
                    onInput={handlePropertyChange("confirm_password")}
                />
                <ErrorDisplay
                    state={validation}
                    path="confirm_password"
                />
                <br />
                <div class="text-right">
                    <Button color="success">
                        Update profile
                    </Button>
                </div>
            </form>
        </div>
    );
}
