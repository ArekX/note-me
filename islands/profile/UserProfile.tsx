import { useSignal } from "@preact/signals";
import { EditUserProfile } from "$schemas/users.ts";
import Input from "$components/Input.tsx";
import Button from "$components/Button.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { supportedTimezoneList } from "$lib/time/time-zone.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    UpdateProfileMessage,
    UpdateProfileResponse,
} from "$workers/websocket/api/users/messages.ts";

interface UserProfileProps {
    initialProfileData: EditUserProfile;
}

export default function UserProfile({ initialProfileData }: UserProfileProps) {
    const userData = useSignal<EditUserProfile>({
        ...initialProfileData,
    });

    const { sendMessage } = useWebsocketService();

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        await sendMessage<UpdateProfileMessage, UpdateProfileResponse>(
            "users",
            "updateProfile",
            {
                data: {
                    data: userData.value,
                },
                expect: "updateProfileResponse",
            },
        );
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
