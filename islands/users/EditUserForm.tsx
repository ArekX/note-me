import { useSignal } from "@preact/signals";
import Dialog from "$islands/Dialog.tsx";
import { Input } from "$components/Input.tsx";
import { Button } from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { UserRecord } from "$backend/repository/user-repository.ts";
import { DropdownList } from "$components/DropdownList.tsx";
import { roleDropDownList } from "$backend/rbac/role-definitions.ts";
import { getUserData } from "$frontend/user-data.ts";
import { createUser, updateUser } from "$frontend/api.ts";
import { supportedTimezoneList } from "$backend/time.ts";

export interface EditableUser extends Omit<UserRecord, "id" | "password"> {
    id: number | null;
    new_password?: string | null;
}

interface EditUserFormProps {
    editUser: EditableUser | null;
    onDone: (reason: "ok" | "cancel") => void;
}

export function EditUserForm(
    { editUser, onDone }: EditUserFormProps,
) {
    const user = useSignal<EditableUser>({ ...editUser } as EditableUser);

    useEffect(() => {
        user.value = { ...editUser } as EditableUser;
    }, [editUser]);

    const setProperty = (name: keyof EditableUser) => (value: string) => {
        user.value = { ...user.value, [name]: value };
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const { id: id, username, role, new_password, ...userData } =
            user.value;

        if (id === null) {
            await createUser({
                ...userData,
                username,
                role,
                password: new_password!,
            });
        } else {
            await updateUser(+id, {
                new_password: new_password!,
                ...userData,
            });
        }

        onDone("ok");
    };

    return (
        <Dialog visible={editUser !== null}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    {user.value.id === null && (
                        <Input
                            label="Username"
                            disabled={user.value.id !== null}
                            type="text"
                            value={user.value.username}
                            onInput={setProperty("username")}
                        />
                    )}
                    {user.value.id !== null && (
                        <span class="text-2xl">Edit {user.value.username}</span>
                    )}
                </div>
                <div className="mb-4">
                    <Input
                        label="Name"
                        type="text"
                        value={user.value.name}
                        onInput={setProperty("name")}
                    />
                </div>
                <div className="mb-4">
                    <DropdownList
                        label="Timezone"
                        items={supportedTimezoneList}
                        value={user.value.timezone}
                        onInput={setProperty("timezone")}
                    />
                </div>
                <div className="mb-4">
                    <DropdownList
                        label="Role"
                        disabled={user.value.id === getUserData().userId}
                        items={roleDropDownList}
                        value={user.value.role}
                        onInput={setProperty("role")}
                    />
                    {user.value.id === getUserData().userId && (
                        <span class="text-sm">
                            You cannot change your own role.
                        </span>
                    )}
                </div>
                <div className="mb-4">
                    <Input
                        label="Set new password"
                        type="password"
                        value={user.value.new_password ?? ""}
                        onInput={setProperty("new_password")}
                    />
                </div>
                <Button type="submit" color="success">Save</Button>{" "}
                <Button onClick={() => onDone("cancel")}>Cancel</Button>
            </form>
        </Dialog>
    );
}
