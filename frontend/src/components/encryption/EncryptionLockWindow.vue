<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import Loader from "@/components/Loader.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useProtectionLockStore } from "@/stores/protection-lock";
import type {
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
} from "@/types/messages";

const protectionLock = useProtectionLockStore();
const { sendMessage } = useWebsocketService();
const loader = useLoader();

const password = ref("");
const isInvalidPassword = ref(false);
const passwordField = ref<HTMLElement | null>(null);

// The field is replaced while the password is checked, so a wrong one is
// typed again without reaching for the mouse.
watch(
    () => loader.running.value,
    async (running) => {
        if (!running && isInvalidPassword.value) {
            await nextTick();
            passwordField.value?.querySelector("input")?.focus();
        }
    },
);

watch(
    () => protectionLock.isUnlockRequested,
    () => {
        password.value = "";
        isInvalidPassword.value = false;
    },
);

const cancel = () =>
    protectionLock.rejectUnlockRequest("User cancelled password entry.");

const confirmUnlock = loader.wrap(async () => {
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

    protectionLock.resolveUnlockRequest(password.value);
});

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        event.preventDefault();
        void confirmUnlock();
    }
};
</script>

<template>
    <Dialog
        v-if="protectionLock.isUnlockRequested"
        can-cancel
        class="w-[32rem]"
        title="Unlock protected notes"
        icon="lock-open-alt"
        @cancel="cancel"
    >
        <div class="text-left">
            <p class="pb-4 text-muted max-md:hidden">
                In order to view protected notes, please enter your password.
            </p>

            <Loader v-if="loader.running.value" color="white">
                Validating...
            </Loader>
            <div v-else ref="passwordField" class="max-md:pt-5">
                <Input
                    v-model="password"
                    type="password"
                    placeholder="Password"
                    label="Password"
                    autofocus
                    @keydown="handleKeydown"
                />
                <p v-if="isInvalidPassword" class="text-danger py-2">
                    Invalid password. Please try again.
                </p>
                <p class="pt-3 text-sm text-muted max-md:hidden">
                    <strong>Important:</strong> After entering your password,
                    all your protected notes will be decrypted viewable unless
                    idle for 5 minutes or until you lock them again by clicking
                    on the lock icon.
                </p>
            </div>
        </div>
        <template v-if="!loader.running.value" #footer>
            <Button @click="cancel">Cancel</Button>
            <Button color="success" @click="confirmUnlock">
                <Icon name="lock-open-alt" size="lg" /> Unlock
            </Button>
        </template>
    </Dialog>
</template>
