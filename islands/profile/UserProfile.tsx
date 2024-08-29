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

const toOptionalValue = (value: string | undefined) =>
    value && value.length > 0 ? value : undefined;

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

        const data = {
            ...userData.value,
            old_password: toOptionalValue(userData.value.old_password),
            new_password: toOptionalValue(userData.value.new_password),
            confirm_password: toOptionalValue(
                userData.value.confirm_password,
            ),
        };

        if (!await validate(data)) {
            return;
        }
        try {
            await user.updateProfile(data);
            addMessage({
                type: "success",
                text: "Profile updated successfully.",
            });
        } catch (e) {
            const error = e as SystemErrorMessage;
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
            <form onSubmit={handleSubmit} class="flex flex-wrap">
                <div class="xl:basis-1/4 max-md:basis-full md:max-lg:basis-2/5">
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
                    <div class="pt-2">
                        <DropdownList
                            label="Timezone"
                            items={supportedTimezoneList}
                            value={userData.value.timezone}
                            onInput={handlePropertyChange("timezone")}
                        />
                    </div>
                </div>
                <div class="xl:basis-1/4 md:pl-2 max-md:pt-2 max-md:basis-full md:basis-1/2 lg:basis-2/5">
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
                    <div class="pt-2">
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
                    </div>
                    <div class="pt-2">
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
                    </div>
                </div>
                <div class="basis-full">
                    <div class="py-4">
                        <Button color="success" type="submit">
                            Update profile
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
