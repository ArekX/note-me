import { useSignal } from "@preact/signals";
import Dialog from "$islands/Dialog.tsx";
import Input from "$components/Input.tsx";
import Button from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { UserRecord } from "$backend/repository/user-repository.ts";
import DropdownList from "$components/DropdownList.tsx";
import { roleDropDownList } from "$backend/rbac/role-definitions.ts";
import { supportedTimezoneList } from "$lib/time/time-zone.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateUserMessage,
    CreateUserResponse,
    UpdateUserMessage,
    UpdateUserResponse,
} from "$workers/websocket/api/users/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";
import { addUserSchema, updateUserSchema } from "$schemas/users.ts";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import { useUser } from "$frontend/hooks/use-user.ts";

export interface EditableUser extends Omit<UserRecord, "id" | "password"> {
    id: number | null;
    new_password?: string | null;
}

interface EditUserFormProps {
    editUser: EditableUser | null;
    onDone: (reason: "ok" | "cancel") => void;
}

export default function EditUserForm(
    { editUser, onDone }: EditUserFormProps,
) {
    const user = useSignal<EditableUser>({ ...editUser } as EditableUser);

    const currentUser = useUser();

    const [userValidation, validateUser] = useValidation<
        | ReturnType<typeof getAddUserData>
        | ReturnType<typeof getUpdateUserData>
    >({
        schema: () => {
            if (user.value.id === null) {
                return addUserSchema;
            }

            return updateUserSchema;
        },
    });

    const { sendMessage } = useWebsocketService();

    useEffect(() => {
        user.value = { ...editUser } as EditableUser;
    }, [editUser]);

    const setProperty = (name: keyof EditableUser) => (value: string) => {
        user.value = { ...user.value, [name]: value };
    };

    const getAddUserData = () => {
        const {
            id: _1,
            username,
            role,
            new_password,
            ...userData
        } = user.value;

        return {
            ...userData,
            username,
            role,
            password: new_password!,
        };
    };

    const getUpdateUserData = () => {
        const {
            id: _1,
            username: _2,
            role: _3,
            new_password: _4,
            ...userData
        } = user.value;

        return {
            new_password: user.value.new_password!,
            ...userData,
        };
    };

    const saveUser = async () => {
        if (user.value.id === null) {
            await sendMessage<CreateUserMessage, CreateUserResponse>(
                "users",
                "createUser",
                {
                    data: {
                        data: getAddUserData(),
                    },
                    expect: "createUserResponse",
                },
            );

            return;
        }

        await sendMessage<UpdateUserMessage, UpdateUserResponse>(
            "users",
            "updateUser",
            {
                data: {
                    id: +user.value.id,
                    data: getUpdateUserData(),
                },
                expect: "updateUserResponse",
            },
        );
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();

        const data = user.value.id === null
            ? getAddUserData()
            : getUpdateUserData();
        if (!await validateUser(data)) {
            return;
        }

        try {
            await saveUser();
        } catch (e) {
            const responseError = e as SystemErrorMessage;
            addMessage({
                type: "error",
                text: "Failed to save user. Reason: " +
                    responseError.data.message,
            });
            return;
        }

        onDone("ok");
    };

    return (
        <Dialog visible={editUser !== null}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    {user.value.id === null && (
                        <>
                            <Input
                                label="Username"
                                disabled={user.value.id !== null}
                                type="text"
                                tabIndex={1}
                                value={user.value.username}
                                onInput={setProperty("username")}
                            />
                            <ErrorDisplay
                                state={userValidation}
                                path="username"
                            />
                        </>
                    )}
                    {user.value.id !== null && (
                        <span class="text-2xl">Edit {user.value.username}</span>
                    )}
                </div>
                <div className="mb-4">
                    <Input
                        label="Name"
                        type="text"
                        tabIndex={2}
                        value={user.value.name}
                        onInput={setProperty("name")}
                    />
                    <ErrorDisplay
                        state={userValidation}
                        path="name"
                    />
                </div>
                <div className="mb-4">
                    <DropdownList
                        label="Timezone"
                        tabIndex={3}
                        items={supportedTimezoneList}
                        value={user.value.timezone}
                        onInput={setProperty("timezone")}
                    />
                    <ErrorDisplay
                        state={userValidation}
                        path="timezone"
                    />
                </div>
                <div className="mb-4">
                    <DropdownList
                        label="Role"
                        tabIndex={4}
                        disabled={user.value.id === currentUser.getUserId()}
                        items={roleDropDownList}
                        value={user.value.role}
                        onInput={setProperty("role")}
                    />
                    {user.value.id === currentUser.getUserId() && (
                        <span class="text-sm">
                            You cannot change your own role.
                        </span>
                    )}
                    <ErrorDisplay
                        state={userValidation}
                        path="role"
                    />
                </div>
                <div className="mb-4">
                    <Input
                        label="Set new password"
                        type="password"
                        tabIndex={5}
                        value={user.value.new_password ?? ""}
                        onInput={setProperty("new_password")}
                    />
                    <ErrorDisplay
                        state={userValidation}
                        path="password"
                    />
                </div>
                <Button type="submit" color="success">Save</Button>{" "}
                <Button onClick={() => onDone("cancel")}>Cancel</Button>
            </form>
        </Dialog>
    );
}
