import Button from "$components/Button.tsx";
import Input from "$components/Input.tsx";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import {
    changeUserPasswordSchema,
    ResetPasswordRequest,
} from "$schemas/users.ts";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import { SystemErrorMessage } from "$frontend/hooks/use-websocket-service.ts";
import { addSystemErrorMessage } from "$frontend/toast-message.ts";
import Logo from "$components/Logo.tsx";

interface ResetUserPasswordProps {
    isNewUser: boolean;
}

export default function ResetUserPassword({
    isNewUser,
}: ResetUserPasswordProps) {
    const resetLoader = useLoader();

    const user = useUser();

    const [validationState, validate] = useValidation<ResetPasswordRequest>({
        schema: changeUserPasswordSchema,
    });

    const oldPassword = useSignal("");
    const newPassword = useSignal("");
    const confirmPassword = useSignal("");

    const handleLogout = () => {
        redirectTo.logout();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        }
    };

    const handleSave = resetLoader.wrap(async () => {
        const isValid = await validate({
            new_password: newPassword.value,
            old_password: oldPassword.value,
            confirm_new_password: confirmPassword.value,
        });

        if (!isValid) {
            return;
        }

        try {
            await user.updateProfile({
                name: user.getName(),
                timezone: user.getTimezone(),
                new_password: newPassword.value,
                old_password: oldPassword.value,
            });
        } catch (e) {
            const systemError = e as SystemErrorMessage;
            addSystemErrorMessage(systemError);
            return;
        }

        window.location.reload();
    });

    return (
        <div class="text-white w-full lg:w-1/2 m-auto p-5">
            <h1 class="text-3xl font-semibold">
                <Logo white={true} height={40} width={40} /> Welcome to NoteMe,
                {" "}
                {user.getName()}!
            </h1>

            <h2 class="text-xl py-5 font-semibold">
                Please {isNewUser ? "set" : "change"} your password
            </h2>

            {isNewUser
                ? (
                    <>
                        <p class="py-4">
                            For security reasons, first time users are required
                            to change their password so that only you have
                            access to your account.
                        </p>
                    </>
                )
                : (
                    <>
                        <p class="py-4">
                            Administrator has changed your password. Due to
                            security reasons you must change your password now.
                        </p>
                        <p class="py-4">
                            Please note that if you had any protected notes,
                            they are now inaccessible as they are tied to your
                            old password.
                        </p>
                    </>
                )}

            <div class="w-1/2 max-md:w-full py-5">
                <div class="py-2">
                    <Input
                        label="Current Password"
                        type="password"
                        value={oldPassword.value}
                        onInput={(value) => oldPassword.value = value}
                        onKeydown={handleKeyDown}
                    />
                    <ErrorDisplay state={validationState} path="old_password" />
                </div>

                <div class="py-2">
                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword.value}
                        onInput={(value) => newPassword.value = value}
                        onKeydown={handleKeyDown}
                    />
                    <ErrorDisplay state={validationState} path="new_password" />
                </div>
                <div class="py-2">
                    <Input
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword.value}
                        onInput={(value) => confirmPassword.value = value}
                        onKeydown={handleKeyDown}
                    />
                    <ErrorDisplay
                        state={validationState}
                        path="confirm_new_password"
                    />
                </div>
            </div>

            <div class="py-4">
                <Button color="success" onClick={handleSave}>
                    Change Password
                </Button>
                <Button
                    name="logout"
                    color="danger"
                    addClass="ml-2"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </div>
        </div>
    );
}
