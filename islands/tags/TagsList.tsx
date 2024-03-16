import { Table } from "$components/Table.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useSignal } from "@preact/signals";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { Pagination } from "$islands/Pagination.tsx";

interface Tag {
    name: string;
}

export function TagsList() {
    const selectedUser = useSignal<Tag | null>(null);

    const currentPage = useSignal(1);

    return (
        <div>
            <div class="p-4 w-full text-right">
                <Button color="success">
                    <Icon name="plus" /> Add
                </Button>
            </div>
            <Table<Tag>
                columns={[
                    { name: <strong>Name</strong>, key: "name" },
                    {
                        name: "Actions",
                        render: (value: Tag) => (
                            <div>
                                <Button color="success">
                                    <Icon name="pencil" /> Edit
                                </Button>{" "}
                                <Button
                                    color="danger"
                                    onClick={() => selectedUser.value = value}
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
                rows={[
                    {
                        name: "John Doe",
                    },
                ]}
            />
            <Pagination
                total={80}
                perPage={5}
                currentPage={currentPage.value}
                onChange={(page) => currentPage.value = page}
            />
            <ConfirmDialog
                visible={selectedUser.value !== null}
                prompt="Are you sure you want to delete this user? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete user"
                onConfirm={() => console.log("Deleting user")}
                onCancel={() => console.log("Cancelled")}
            />
        </div>
    );
}
