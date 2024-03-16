import { useSignal } from "@preact/signals";
import Dialog from "$islands/Dialog.tsx";
import { Input } from "$components/Input.tsx";
import { Button } from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { UserRecord } from "$backend/repository/user-repository.ts";

export interface EditableUser extends Omit<UserRecord, "id" | "password"> {
    id: number | null;
}

interface EditUserFormProps {
    editUser: EditableUser | null;
    onDone: () => void;
}

export function EditUserForm({ editUser, onDone }: EditUserFormProps) {
    const user = useSignal<EditableUser>({ ...editUser } as EditableUser);

    useEffect(() => {
        user.value = { ...editUser } as EditableUser;
    }, [editUser]);

    const setProperty = (name: keyof EditableUser) => (value: string) => {
        user.value = { ...user.value, [name]: value };
    };

    const handleSubmit = (event: Event) => {
        event.preventDefault();

        if (user.value.id === null) {
            console.log("create");
        } else {
            console.log("update");
        }

        console.log(user.value);
        onDone();
    };

    return (
        <Dialog visible={editUser !== null}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <Input
                        label="Name"
                        type="text"
                        value={user.value.name}
                        onInput={setProperty("name")}
                    />
                </div>
                <div className="mb-4">
                    <Input
                        label="Username"
                        type="email"
                        value={user.value.username}
                        onInput={setProperty("username")}
                    />
                </div>
                <div className="mb-4">
                    <Input
                        label="Role"
                        type="text"
                        value={user.value.role}
                        onInput={setProperty("role")}
                    />
                </div>
                <Button type="submit" color="success">Save</Button>{" "}
                <Button onClick={() => onDone()}>Cancel</Button>
            </form>
        </Dialog>
    );
}
