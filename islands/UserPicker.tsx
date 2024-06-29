import { PickUserRecord } from "$backend/repository/user-repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Input from "$components/Input.tsx";
import Loader from "$islands/Loader.tsx";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import {
    FindPickUsersMessage,
    FindPickUsersResponse,
} from "$workers/websocket/api/users/messages.ts";
import Pagination from "$islands/Pagination.tsx";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useLoader } from "../frontend/hooks/use-loader.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { JSX } from "preact/jsx-runtime";

interface UserPickerProps {
    onSelectUser: (user: PickUserRecord) => void;
    onUnselectUser: (user: PickUserRecord) => void;
    selected: PickUserRecord[];
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
    <div class="flex justify-between border-b-gray-400 border-b-2 pb-2 mb-2 items-center last:border-b-0">
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
}: UserPickerProps) {
    const { results, page, total, perPage, setPagedData, resetPage } =
        usePagedData<
            PickUserRecord
        >();

    const { sendMessage } = useWebsocketService();

    const userLoader = useLoader();

    const performSearch = userLoader.wrap(async () => {
        if (filters.value.searchText === "") {
            setPagedData({
                results: [],
            });
            return;
        }
        const response = await sendMessage<
            FindPickUsersMessage,
            FindPickUsersResponse
        >("users", "findPickUsers", {
            data: {
                filters: {
                    name: filters.value.searchText,
                    exclude_user_ids: selected.map((user) => user.id),
                },
                page: page.value,
            },
            expect: "findPickUsersResponse",
        });

        setPagedData(response.records);
    });

    const { filters, setFilter } = useFilters({
        initialFilters: () => ({
            searchText: "",
        }),
        onFilterLoad: () => {
            resetPage();
            return performSearch();
        },
        onFiltersSet: () => {
            userLoader.start();
        },
    });

    const handlePageChange = (newPage: number) => {
        setPagedData({ page: newPage });
        performSearch();
    };

    const addableUsers = results.value.filter((user) =>
        !selected.find((s) => s.id == user.id)
    );

    return (
        <div>
            <div class="w-full">
                <Input
                    label="Search for user"
                    placeholder="Name or Username"
                    value={filters.value.searchText}
                    onInput={(value) => setFilter("searchText", value)}
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
                    : filters.value.searchText.length > 0 && (
                        <div class="mt-2">
                            <div class="text-sm mb-2">Found Users</div>
                            <div class="w-full">
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
                                    <div class="text-gray-500">
                                        No more users to add.
                                    </div>
                                )}

                                {total.value === 0 && (
                                    <div class="text-gray-500">
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
                <div>
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
                        <div class="text-gray-500">{noSelectedUsersText}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
