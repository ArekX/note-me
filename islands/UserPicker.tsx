import { PickUserRecord } from "$backend/repository/user-repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Input from "$components/Input.tsx";
import Loader from "$islands/Loader.tsx";
import {
    FindPickUsersMessage,
    FindPickUsersResponse,
} from "$workers/websocket/api/users/messages.ts";
import Pagination from "$islands/Pagination.tsx";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { JSX } from "preact/jsx-runtime";
import { useUser } from "$frontend/hooks/use-user.ts";
import { useSignal } from "@preact/signals";

interface UserPickerProps {
    onSelectUser: (user: PickUserRecord) => void;
    onUnselectUser: (user: PickUserRecord) => void;
    selected: PickUserRecord[];
    excludeCurrentUser?: boolean;
    selectedUsersText?: string;
    noSelectedUsersText?: string;
}

interface UserItemProps {
    user: PickUserRecord;
    button: JSX.Element;
}

const UserItem = ({
    user,
    button,
}: UserItemProps) => (
    <div class="flex justify-between rounded-lg border-gray-600/50 border-b-0 border p-2 bg-gray-700/50 mb-2 items-center last:border-b-0">
        <div>{user.name} ({user.username})</div>
        <div>
            {button}
        </div>
    </div>
);

export default function UserPicker({
    onSelectUser,
    onUnselectUser,
    selected,
    selectedUsersText = "Selected users",
    noSelectedUsersText = "No users selected",
    excludeCurrentUser = true,
}: UserPickerProps) {
    const { results, page, total, perPage, setPagedData, resetPage } =
        usePagedData<
            PickUserRecord
        >();

    const { sendMessage } = useWebsocketService();
    const searchText = useSignal("");
    const selectedUsers = useSignal<PickUserRecord[]>(selected);

    const userLoader = useLoader();
    const user = useUser();

    const performSearch = userLoader.wrap(async () => {
        if (searchText.value === "") {
            setPagedData({
                results: [],
            });
            return;
        }

        const excludeUserIds = selectedUsers.value.map((user) => user.id);

        if (excludeCurrentUser) {
            const currentUserId = user.getUserId();
            if (currentUserId) {
                excludeUserIds.push(currentUserId);
            }
        }

        const response = await sendMessage<
            FindPickUsersMessage,
            FindPickUsersResponse
        >("users", "findPickUsers", {
            data: {
                filters: {
                    name: searchText.value,
                    exclude_user_ids: excludeUserIds,
                },
                page: page.value,
            },
            expect: "findPickUsersResponse",
        });

        setPagedData(response.records);
    });

    const handlePageChange = (newPage: number) => {
        setPagedData({ page: newPage });
        performSearch();
    };

    if (selectedUsers.value !== selected) {
        selectedUsers.value = selected;
        resetPage();
        performSearch();
    }

    const addableUsers = results.value.filter((user) =>
        !selectedUsers.value.find((s) => s.id == user.id)
    );

    const handleSearchChange = (value: string) => {
        searchText.value = value;
        resetPage();
        performSearch();
    };

    return (
        <div>
            <div class="w-full">
                <Input
                    label="Search for user"
                    placeholder="Name or Username"
                    value={searchText.value}
                    onInput={handleSearchChange}
                />
            </div>

            {results.value !== null && (
                userLoader.running
                    ? (
                        <div class="mt-2">
                            <Loader color="white">
                                Searching for users...
                            </Loader>
                        </div>
                    )
                    : searchText.value.length > 0 && (
                        <div class="mt-2">
                            <div class="text-sm mb-2">Found Users</div>
                            <div class="grid grid-cols-2 gap-2">
                                {addableUsers
                                    .map((user) => (
                                        <UserItem
                                            key={user.id}
                                            user={user}
                                            button={
                                                <Button
                                                    color="success"
                                                    size="sm"
                                                    title={`Add ${user.name} to selected users`}
                                                    onClick={() =>
                                                        onSelectUser(user)}
                                                >
                                                    <Icon name="plus" />
                                                </Button>
                                            }
                                        />
                                    ))}
                                {results.value.length > 0 &&
                                    addableUsers.length === 0 && (
                                    <div class="text-gray-400">
                                        No more users to add.
                                    </div>
                                )}

                                {total.value === 0 && (
                                    <div class="text-gray-400">
                                        No users found
                                    </div>
                                )}
                                <Pagination
                                    currentPage={page.value}
                                    perPage={perPage.value}
                                    total={total.value}
                                    onChange={handlePageChange}
                                />
                            </div>
                        </div>
                    )
            )}

            <div class="mt-2">
                <div class="text-sm">{selectedUsersText}</div>
                <div class="grid md:grid-cols-2 md:gap-2 max-md:grid-cols-1">
                    {selected.map((user) => (
                        <UserItem
                            key={user.id}
                            user={user}
                            button={
                                <Button
                                    color="danger"
                                    size="sm"
                                    addClass="ml-2"
                                    title={`Remove ${user.name} from selected users`}
                                    onClick={() => onUnselectUser(user)}
                                >
                                    <Icon name="minus" />
                                </Button>
                            }
                        />
                    ))}
                    {selected.length === 0 && (
                        <div class="text-gray-400">{noSelectedUsersText}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
