import Table from "$components/Table.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Pagination from "$islands/Pagination.tsx";
import EditUserForm, { EditableUser } from "$islands/users/EditUserForm.tsx";
import { useEffect } from "preact/hooks";
import {
    roleDropDownList,
    roleLabelMap,
} from "$backend/rbac/role-definitions.ts";
import { useFilterFactory } from "$components/filters/FilterFactory.tsx";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteUserMessage,
    DeleteUserResponse,
    FindUsersMessage,
    FindUsersResponse,
} from "$workers/websocket/api/users/messages.ts";
import { getBrowserTimezone } from "$frontend/time.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
export default function UserList() {
    const userToDelete = useSelected<EditableUser>();
    const userToEdit = useSelected<EditableUser>();

    const userLoader = useLoader();

    const {
        page,
        perPage,
        results,
        total,
        setPagedData,
        resetPage,
    } = usePagedData<EditableUser>();

    const { sendMessage } = useWebsocketService();

    const loadUsers = userLoader.wrap(async () => {
        const { records } = await sendMessage<
            FindUsersMessage,
            FindUsersResponse
        >(
            "users",
            "findUsers",
            {
                data: {
                    filters: filters.value,
                    page: page.value,
                },
                expect: "findUsersResponse",
            },
        );

        setPagedData(records);
    });

    const { filters, setFilters } = useFilters<
        FindUsersMessage["filters"]
    >({
        initialFilters: () => ({
            name: "",
            username: "",
            role: "",
        }),
        onFilterLoad: () => {
            resetPage();
            return loadUsers();
        },
    });

    const filterFactory = useFilterFactory<FindUsersMessage["filters"]>(
        filters.value,
        setFilters,
    );

    const handlePageChanged = (page: number) => {
        setPagedData({ page });
        loadUsers();
    };

    const handleUserFinishedEditing = (reason: "ok" | "cancel") => {
        userToEdit.unselect();
        if (reason === "ok") {
            loadUsers();
        }
    };

    const handleConfirmDelete = async () => {
        await sendMessage<DeleteUserMessage, DeleteUserResponse>(
            "users",
            "deleteUser",
            {
                data: {
                    id: userToDelete.selected.value!.id!,
                },
                expect: "deleteUserResponse",
            },
        );
        userToDelete.unselect();
        await loadUsers();
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const user = useUser();

    return (
        <div class="p-4">
            {user.can(CanManageUsers.Create) && (
                <div class="p-4 w-full text-right">
                    <Button
                        color="success"
                        onClick={() => {
                            userToEdit.select({
                                id: null,
                                name: "",
                                username: "",
                                timezone: getBrowserTimezone(),
                                new_password: "",
                                role: "user",
                            });
                        }}
                    >
                        <Icon name="plus" /> Add
                    </Button>
                </div>
            )}
            <Table<EditableUser>
                isLoading={userLoader.running}
                noRowsRow={
                    <tr>
                        <td colSpan={4} class="text-center">
                            No users found.
                        </td>
                    </tr>
                }
                columns={[
                    {
                        name: "Name",
                        key: "name",
                        filter: filterFactory.name.text(),
                    },
                    {
                        name: "Username",
                        key: "username",
                        filter: filterFactory.username.text(),
                    },
                    {
                        name: "Role",
                        render: (value) => roleLabelMap[value.role],
                        filter: filterFactory.role.list(roleDropDownList),
                    },
                    {
                        name: "Actions",
                        render: (value: EditableUser) => (
                            <div>
                                {user.can(CanManageUsers.Delete) && (
                                    <Button
                                        color="success"
                                        onClick={() => userToEdit.select(value)}
                                    >
                                        <Icon name="pencil" /> Edit
                                    </Button>
                                )} {user.can(CanManageUsers.Delete) &&
                                    value.id !== user.getUserId() && (
                                    <Button
                                        color="danger"
                                        onClick={() =>
                                            userToDelete.select(value)}
                                    >
                                        <Icon name="minus" /> Delete
                                    </Button>
                                )}
                            </div>
                        ),
                    },
                ]}
                bodyRowProps={{
                    class: "text-center",
                }}
                rows={results.value}
            />
            {!userLoader.running && (
                <Pagination
                    total={total.value}
                    perPage={perPage.value}
                    currentPage={page.value}
                    onChange={handlePageChanged}
                />
            )}
            <ConfirmDialog
                visible={userToDelete.selected.value !== null}
                prompt="Are you sure you want to delete this user? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete user"
                onConfirm={handleConfirmDelete}
                onCancel={() => userToDelete.unselect()}
            />
            <EditUserForm
                editUser={userToEdit.selected.value}
                onDone={handleUserFinishedEditing}
            />
        </div>
    );
}
