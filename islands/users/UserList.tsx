import { Table } from "$components/Table.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useSignal } from "@preact/signals";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { Pagination } from "$islands/Pagination.tsx";
import { EditableUser, EditUserForm } from "$islands/users/EditUserForm.tsx";
import { useEffect } from "preact/hooks";
import { deleteUser, findUsers } from "$frontend/api.ts";
import {
    roleDropDownList,
    roleLabelMap,
} from "$backend/rbac/role-definitions.ts";
import { getUserData } from "$frontend/user-data.ts";
import { FindUserRequest } from "$backend/api-handlers/users/find-users.ts";
import { useFilterFactory } from "$components/filters/FilterFactory.tsx";
import { CanManageUsers } from "$backend/rbac/permissions.ts";

export function UserList() {
    const userToDelete = useSignal<EditableUser | null>(null);
    const userToEdit = useSignal<EditableUser | null>(null);
    const isLoading = useSignal<boolean>(true);
    const currentPage = useSignal(1);
    const totalUsers = useSignal(0);
    const perPage = useSignal(20);
    const filters = useSignal<Partial<FindUserRequest>>({
        name: "",
        username: "",
        role: "",
    });

    const userList = useSignal<EditableUser[]>([]);

    const loadUsers = async () => {
        isLoading.value = true;
        const { data } = await findUsers({
            ...filters.value,
            page: currentPage.value,
        });
        userList.value = data.results;
        totalUsers.value = data.total;
        perPage.value = data.perPage;
        isLoading.value = false;
    };

    const filterFactory = useFilterFactory(
        filters.value,
        (newFilters: Partial<FindUserRequest>) => {
            filters.value = newFilters;
            currentPage.value = 1;
            loadUsers();
        },
    );

    const handlePageChanged = (page: number) => {
        currentPage.value = page;
        loadUsers();
    };

    const handleUserFinishedEditing = (reason: "ok" | "cancel") => {
        userToEdit.value = null;
        if (reason === "ok") {
            loadUsers();
        }
    };

    const handleConfirmDelete = async () => {
        await deleteUser(userToDelete.value!.id!);
        userToDelete.value = null;
        await loadUsers();
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const user = getUserData();

    return (
        <div class="p-4">
            {user.can(CanManageUsers.Create) && (
                <div class="p-4 w-full text-right">
                    <Button
                        color="success"
                        onClick={() => {
                            userToEdit.value = {
                                id: null,
                                name: "",
                                username: "",
                                timezone: "",
                                new_password: "",
                                role: "user",
                            };
                        }}
                    >
                        <Icon name="plus" /> Add
                    </Button>
                </div>
            )}
            <Table<EditableUser>
                isLoading={isLoading.value}
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
                                        onClick={() => userToEdit.value = value}
                                    >
                                        <Icon name="pencil" /> Edit
                                    </Button>
                                )} {user.can(CanManageUsers.Delete) &&
                                    value.id !== getUserData().userId && (
                                    <Button
                                        color="danger"
                                        onClick={() =>
                                            userToDelete.value = value}
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
                rows={userList.value}
            />
            {!isLoading.value && (
                <Pagination
                    total={totalUsers.value}
                    perPage={perPage.value}
                    currentPage={currentPage.value}
                    onChange={handlePageChanged}
                />
            )}
            <ConfirmDialog
                visible={userToDelete.value !== null}
                prompt="Are you sure you want to delete this user? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete user"
                onConfirm={handleConfirmDelete}
                onCancel={() => userToDelete.value = null}
            />
            <EditUserForm
                editUser={userToEdit.value}
                onDone={handleUserFinishedEditing}
            />
        </div>
    );
}
