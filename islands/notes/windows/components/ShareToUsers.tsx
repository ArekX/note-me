import { PickUserRecord } from "$db";
import { useSignal } from "@preact/signals";
import {
    ShareToUsersMessage,
    ShareToUsersResponse,
} from "$workers/websocket/api/notes/messages.ts";
import UserPicker from "$islands/UserPicker.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";

export interface ShareToUsersProps {
    initialUsers: PickUserRecord[];
    noteId: number;
    onUserListChanged: (newList: PickUserRecord[]) => void;
}

export default function ShareToUsers({
    initialUsers,
    noteId,
    onUserListChanged,
}: ShareToUsersProps) {
    const selectedUsers = useSignal<PickUserRecord[]>(initialUsers);

    const { sendMessage } = useWebsocketService();

    const saveSharedUsers = async () => {
        await sendMessage<ShareToUsersMessage, ShareToUsersResponse>(
            "notes",
            "shareToUsers",
            {
                data: {
                    note_id: noteId,
                    user_ids: selectedUsers.value.map((u) => u.id),
                },
                expect: "shareToUsersResponse",
            },
        );

        onUserListChanged(selectedUsers.value);
    };

    const handleSelectUser = async (user: PickUserRecord) => {
        selectedUsers.value = [...selectedUsers.value, user];

        await saveSharedUsers();
    };

    const handleUnselectUser = async (user: PickUserRecord) => {
        selectedUsers.value = selectedUsers.value.filter((u) =>
            u.id !== user.id
        );

        await saveSharedUsers();
    };

    return (
        <div>
            <UserPicker
                onSelectUser={handleSelectUser}
                onUnselectUser={handleUnselectUser}
                selected={selectedUsers.value}
                selectedUsersText="Note is shared to:"
                noSelectedUsersText="No users."
            />
        </div>
    );
}
