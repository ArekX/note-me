import { Table } from "$components/Table.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useSignal } from "@preact/signals";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { Pagination } from "$islands/Pagination.tsx";
import { EditableUser, EditUserForm } from "$islands/users/EditUserForm.tsx";
import { useEffect } from "preact/hooks";
import { findUsers } from "$frontend/api.ts";

export function UserList() {
    const userToDelete = useSignal<EditableUser | null>(null);
    const userToEdit = useSignal<EditableUser | null>(null);
    const currentPage = useSignal(1);
    const totalUsers = useSignal(0);
    const perPage = useSignal(20);

    const userList = useSignal<EditableUser[]>([]);

    const loadUsers = async () => {
        const { data } = await findUsers({
            page: currentPage.value,
        });
        userList.value = data.results;
        totalUsers.value = data.total;
        perPage.value = data.perPage;
    };

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div>
            <div class="p-4 w-full text-right">
                <Button
                    color="success"
                    onClick={() => {
                        userToEdit.value = {
                            id: null,
                            name: "",
                            username: "",
                            timezone: "",
                            role: "user",
                        };
                    }}
                >
                    <Icon name="plus" /> Add
                </Button>
            </div>
            <Table<EditableUser>
                columns={[
                    { name: <strong>Name</strong>, key: "name" },
                    { name: "Username", key: "username" },
                    { name: "Role", key: "role" },
                    {
                        name: "Actions",
                        render: (value: EditableUser) => (
                            <div>
                                <Button
                                    color="success"
                                    onClick={() => userToEdit.value = value}
                                >
                                    <Icon name="pencil" /> Edit
                                </Button>{" "}
                                <Button
                                    color="danger"
                                    onClick={() => userToDelete.value = value}
                                >
                                    <Icon name="minus" /> Delete
                                </Button>
                            </div>
                        ),
                    },
                ]}
                bodyRowProps={{
                    class: "text-center",
                }}
                rows={userList.value}
            />
            <Pagination
                total={totalUsers.value}
                perPage={perPage.value}
                currentPage={currentPage.value}
                onChange={(page) => currentPage.value = page}
            />
            <ConfirmDialog
                visible={userToDelete.value !== null}
                prompt="Are you sure you want to delete this user? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete user"
                onConfirm={() => console.log("Deleting user")}
                onCancel={() => console.log("Cancelled")}
            />
            <EditUserForm
                editUser={userToEdit.value}
                onDone={() => userToEdit.value = null}
            />
        </div>
    );
}
