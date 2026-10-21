<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { UserOnboardingState } from "@/types/records";

// "Don't show this again" stores the key, "Close" only hides it on this
// page.
const props = withDefaults(
    defineProps<{
        onboardingKey: keyof UserOnboardingState;
        title?: string;
        widthClass?: string;
    }>(),
    { title: "", widthClass: "w-1/2 max-md:w-full" },
);

defineSlots<{ default(props: { close: () => void }): unknown }>();

const userStore = useUserStore();
const isClosed = ref(false);

const isVisible = computed(
    () =>
        !isClosed.value &&
        userStore.user !== null &&
        !userStore.user.onboarding_state[props.onboardingKey],
);

const close = () => {
    isClosed.value = true;
};

const dismiss = async () => {
    isClosed.value = true;
    try {
        await userStore.updateOnboardingState({ [props.onboardingKey]: true });
    } catch (error) {
        useToastStore().reportError(error);
    }
};
</script>

<template>
    <Dialog v-if="isVisible" :title="title" icon="bulb" :class="widthClass">
        <div class="onboarding-contents">
            <slot :close="close" />
        </div>
        <template #footer>
            <Button
                title="Close this dialog without dismissing the message."
                @click="close"
            >
                Close
            </Button>
            <Button
                color="success"
                title="Dismiss this message so that it won't show again."
                @click="dismiss"
            >
                Don't show this again
            </Button>
        </template>
    </Dialog>
</template>
