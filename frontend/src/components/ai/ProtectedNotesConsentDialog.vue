<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import Callout from "@/components/Callout.vue";
import Dialog from "@/components/Dialog.vue";
import Input from "@/components/Input.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { ALLOW_DELAY_SECONDS, useAiConsentStore } from "@/stores/ai-consent";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useToastStore } from "@/stores/toast";
import type {
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
} from "@/types/messages";

const consent = useAiConsentStore();
const protectionLock = useProtectionLockStore();
const { sendMessage } = useWebsocketService();
const loader = useLoader();

const password = ref("");
const isInvalidPassword = ref(false);
const passwordField = ref<HTMLElement | null>(null);

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
const secondsLeft = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

const stopCountdown = () => {
    clearInterval(timer);
    timer = undefined;
};

// Without a password to type the allow button waits, so it is not pressed
// by accident.
watch(
    () => consent.request,
    (request) => {
        password.value = "";
        isInvalidPassword.value = false;
        stopCountdown();
        if (request && !request.needsPassword) {
            secondsLeft.value = ALLOW_DELAY_SECONDS;
            timer = setInterval(() => {
                secondsLeft.value--;
                if (secondsLeft.value <= 0) {
                    stopCountdown();
                }
            }, 1000);
        }
    },
);

onBeforeUnmount(stopCountdown);

const allowLabel = computed(() =>
    secondsLeft.value > 0
        ? `Allow for this conversation (${secondsLeft.value})`
        : "Allow for this conversation",
);

const unlockAndAllow = loader.wrap(async () => {
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
    protectionLock.resolveUnlockRequest(password.value);
    consent.answer(true);
});

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        event.preventDefault();
        void unlockAndAllow();
    }
};
</script>

<template>
    <Dialog
        v-if="consent.request"
        can-cancel
        class="w-[34rem]"
        title="Allow access to protected notes"
        icon="lock-open-alt"
        @cancel="consent.answer(false)"
    >
        <Callout tone="warning" icon="error" class="mb-2">
            Protected note data will be sent to the AI provider.
        </Callout>
        <p class="text-sm text-muted pb-3">
            Your password is never sent to the AI.
        </p>
        <div v-if="consent.request.needsPassword" ref="passwordField">
            <p class="text-sm pb-3">
                Protected notes are locked. Enter your password to unlock them.
            </p>
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
            <Button @click="consent.answer(false)">Deny</Button>
            <Button
                v-if="consent.request.needsPassword"
                color="warning"
                :disabled="loader.running.value || password === ''"
                @click="unlockAndAllow"
            >
                Unlock and allow for this conversation
            </Button>
            <Button
                v-else
                color="warning"
                :disabled="secondsLeft > 0"
                @click="consent.answer(true)"
            >
                {{ allowLabel }}
            </Button>
        </template>
    </Dialog>
</template>
