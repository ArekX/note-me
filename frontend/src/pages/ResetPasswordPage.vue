<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Logo from "@/components/Logo.vue";
import Input from "@/components/Input.vue";
import Button from "@/components/Button.vue";
import { useUserStore } from "@/stores/user";
import { useToastStore } from "@/stores/toast";
import { useValidation } from "@/composables/useValidation";
import { useLoader } from "@/composables/useLoader";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { getDisplayMessage, parseValidationIssues } from "@/lib/error-messages";
import { sameSitePath } from "@/lib/redirect";
import {
    changeUserPasswordSchema,
    type ResetPasswordRequest,
} from "@/schemas/users";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toastStore = useToastStore();

const validation = useValidation<ResetPasswordRequest>(
    changeUserPasswordSchema,
);

const isNewUser = computed(
    () => userStore.user?.created_at === userStore.user?.updated_at,
);
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const saving = useLoader();

const showError = (message: string) =>
    toastStore.addMessage({ type: "error", text: message });

const save = async () => {
    if (saving.running.value) {
        return;
    }

    const data: ResetPasswordRequest = {
        old_password: oldPassword.value,
        new_password: newPassword.value,
        confirm_password: confirmPassword.value,
    };

    if (!(await validation.validate(data))) {
        return;
    }

    await saving.run(async () => {
        try {
            await userStore.processStep({
                step: "password_reset",
                action: "change",
                data,
            });
            await router.push(
                sameSitePath(route.query.redirect) ?? { name: "dashboard" },
            );
        } catch (error) {
            const issues =
                error instanceof ApiError
                    ? parseValidationIssues(error.message)
                    : null;
            if (issues) {
                validation.setErrors(issues);
                showError(getDisplayMessage(issues));
                return;
            }
            showError(apiErrorMessage(error));
        }
    });
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        void save();
    }
};
</script>

<template>
    <div class="text-fg w-full max-w-2xl m-auto px-10 py-10 max-md:px-4">
        <h1 class="text-3xl font-bold tracking-tight">
            <Logo white :size="40" /> Welcome to NoteMe,
            {{ userStore.user?.name }}!
        </h1>

        <h2 class="text-xl pt-6 pb-2 font-semibold">
            Please {{ isNewUser ? "set" : "change" }} your password
        </h2>

        <template v-if="isNewUser">
            <p class="py-2 text-muted">
                For security reasons, first time users are required to change
                their password so that only you have access to your account.
            </p>
        </template>
        <template v-else>
            <p class="py-2 text-muted">
                Administrator has changed your password. Due to security reasons
                you must change your password now.
            </p>
            <p class="py-2 text-muted">
                Please note that if you had any protected notes, they are now
                inaccessible as they are tied to your old password.
            </p>
        </template>

        <div class="max-w-sm py-5 flex flex-col gap-1">
            <div class="py-2">
                <Input
                    v-model="oldPassword"
                    label="Current Password"
                    type="password"
                    @keydown="handleKeyDown"
                    :validation="validation.state"
                    path="old_password"
                />
            </div>
            <div class="py-2">
                <Input
                    v-model="newPassword"
                    label="New Password"
                    type="password"
                    @keydown="handleKeyDown"
                    :validation="validation.state"
                    path="new_password"
                />
            </div>
            <div class="py-2">
                <Input
                    v-model="confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    @keydown="handleKeyDown"
                    :validation="validation.state"
                    path="confirm_password"
                />
            </div>
        </div>

        <div class="py-4">
            <Button
                color="success"
                :disabled="saving.running.value"
                @click="save"
            >
                Change Password
            </Button>
            <RouterLink :to="{ name: 'logout' }">
                <Button name="logout" color="primary" add-class="ml-2">
                    Logout
                </Button>
            </RouterLink>
        </div>
    </div>
</template>
