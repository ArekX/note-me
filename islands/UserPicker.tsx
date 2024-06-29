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

interface UserPickerProps {
    onSelected: (users: PickUserRecord[]) => void;
    selected: PickUserRecord[];
}

export default function UserPicker({
    // onSelected,
    selected,
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
        onFilterUpdated: () => {
            resetPage();
            return performSearch();
        },
    });

    const handlePageChange = (newPage: number) => {
        setPagedData({ page: newPage });
        performSearch();
    };

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
                    : (
                        <div class="mt-2">
                            <div class="text-sm mb-2">Found Users</div>
                            <div>
                                {results.value.map((user) => (
                                    <div key={user.id}>
                                        {user.name} ({user.username})
                                    </div>
                                ))}
                                {results.value.length === 0 && (
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
                <div class="text-sm">Selected users</div>
                <div>
                    {selected.map((user) => <div key={user.id}>{user.name}
                    </div>)}
                    {selected.length === 0 && (
                        <div class="text-gray-500">No users selected</div>
                    )}
                </div>
            </div>
        </div>
    );
}
