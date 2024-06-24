import { PickUserRecord } from "$backend/repository/user-repository.ts";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useEffect } from "https://esm.sh/v128/preact@10.19.6/hooks/src/index.js";
import {
    FindPickUsersMessage,
    FindPickUsersResponse,
} from "$workers/websocket/api/users/messages.ts";

export interface UserPickContainer {
    record: PickUserRecord | null;
    record_id: number;
    is_loading: boolean;
}

interface UserPickerProps {
    onSelected: (users: UserPickContainer[]) => void;
    selected: UserPickContainer[];
}

export default function UserPicker({
    // onSelected,
    selected,
}: UserPickerProps) {
    // const userList = useSignal<UserPickContainer[]>([]);
    const selectedUsers = useSignal<UserPickContainer[]>(selected);

    const { sendMessage } = useWebsocketService();

    const loadRecordForContainer = async (containers: UserPickContainer[]) => {
        const userIds = containers.filter((c) => c.record === null).map((c) =>
            c.record_id
        );

        if (userIds.length === 0) {
            return;
        }

        const idChunks = userIds.reduce<number[][]>((acc, id) => {
            const lastChunk = acc[acc.length - 1];
            if (lastChunk.length >= 20) {
                acc.push([id]);
            } else {
                lastChunk.push(id);
            }
            return acc;
        }, []);

        for (const chunk of idChunks) {
            containers.filter((c) => chunk.includes(c.record_id)).forEach((c) =>
                c.is_loading = true
            );

            const users = await sendMessage<
                FindPickUsersMessage,
                FindPickUsersResponse
            >(
                "users",
                "findPickUsers",
                {
                    data: {
                        filters: {
                            user_ids: chunk,
                        },
                        page: 1,
                    },
                    expect: "findPickUsersResponse",
                },
            );

            for (const user of users.records.results) {
                const container = containers.find((c) =>
                    c.record_id === user.id
                );
                if (!container) {
                    continue;
                }

                container.record = user;
                container.is_loading = false;
            }
        }

        selectedUsers.value = [...containers];
    };

    useEffect(() => {
        loadRecordForContainer(selectedUsers.value);
    }, [selectedUsers.value]);

    useEffect(() => {
        selectedUsers.value = selected;
    }, [selected]);

    return (
        <div>
            UserPicker
        </div>
    );
}
