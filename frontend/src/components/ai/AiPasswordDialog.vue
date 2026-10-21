<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Input from "@/components/Input.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useAiPasswordStore } from "@/stores/ai-password";
import { useToastStore } from "@/stores/toast";
import type {
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
} from "@/types/messages";

const passwordStore = useAiPasswordStore();
const { sendMessage } = useWebsocketService();
const loader = useLoader();

const password = ref("");
const isInvalidPassword = ref(false);
const passwordField = ref<HTMLElement | null>(null);

watch(
    () => passwordStore.request,
    () => {
        password.value = "";
        isInvalidPassword.value = false;
    },
);

// The field is disabled while the password is checked, which drops its
// focus, so a wrong one is typed again without reaching for the mouse.
watch(
    () => loader.running.value,
    async (running) => {
        if (!running && isInvalidPassword.value) {
            await nextTick();
            passwordField.value?.querySelector("input")?.focus();
        }
    },
);

const confirm = loader.wrap(async () => {
    try {
        const { verified } = await sendMessage<
            VerifyOwnPasswordMessage,
            VerifyOwnPasswordResponse
        >("users", "verifyOwnPassword", {
            data: { password: password.value },
            expect: "verifyOwnPasswordResponse",
        });
        if (!verified) {
            isInvalidPassword.value = true;
            return;
        }
    } catch (error) {
        useToastStore().reportError(error);
        return;
    }
    passwordStore.answer(password.value);
});

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        event.preventDefault();
        void confirm();
    }
};
</script>

<template>
    <Dialog
        v-if="passwordStore.request"
        can-cancel
        class="w-[30rem]"
        :title="passwordStore.request.title"
        icon="key"
        @cancel="passwordStore.answer(null)"
    >
        <p class="text-sm pb-3">{{ passwordStore.request.message }}</p>
        <div ref="passwordField">
            <Input
                v-model="password"
                type="password"
                label="Password"
                placeholder="Password"
                autofocus
                :disabled="loader.running.value"
                @keydown="handleKeydown"
            />
            <p v-if="isInvalidPassword" class="text-danger py-2">
                Invalid password. Please try again.
            </p>
        </div>
        <template #footer>
            <Button @click="passwordStore.answer(null)">Cancel</Button>
            <Button
                color="success"
                :disabled="loader.running.value || password === ''"
                @click="confirm"
            >
                {{ passwordStore.request.confirmLabel }}
            </Button>
        </template>
    </Dialog>
</template>
