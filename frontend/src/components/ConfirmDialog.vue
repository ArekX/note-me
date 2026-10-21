<script setup lang="ts">
import Button, { type ButtonColor } from "./Button.vue";
import Dialog from "./Dialog.vue";
import Icon from "./Icon.vue";
import Loader from "./Loader.vue";

withDefaults(
    defineProps<{
        visible?: boolean;
        isProcessing?: boolean;
        prompt?: string;
        confirmText?: string;
        cancelText?: string;
        confirmColor?: ButtonColor;
        cancelColor?: ButtonColor;
    }>(),
    {
        visible: true,
        isProcessing: false,
        prompt: "",
        confirmText: "Ok",
        cancelText: "Cancel",
        confirmColor: "primary",
        cancelColor: "primary",
    },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
    <Dialog
        :visible="visible"
        can-cancel
        class="select-none"
        @cancel="emit('cancel')"
    >
        <div class="flex items-start gap-4 max-w-md">
            <span
                :class="[
                    'shrink-0 size-10 grid place-items-center rounded-full',
                    confirmColor === 'danger'
                        ? 'bg-danger-soft text-danger'
                        : 'bg-accent-soft text-accent',
                ]"
            >
                <Icon
                    :name="confirmColor === 'danger' ? 'trash' : 'help-circle'"
                    size="xl"
                />
            </span>
            <div class="pt-2 text-muted">
                <slot name="prompt">{{ prompt }}</slot>
            </div>
        </div>
        <template #footer>
            <Loader v-if="isProcessing" color="white">Processing...</Loader>
            <template v-else>
                <Button :color="cancelColor" @click="emit('cancel')">
                    {{ cancelText }}
                </Button>
                <Button
                    :color="confirmColor"
                    autofocus
                    @click="emit('confirm')"
                >
                    {{ confirmText }}
                </Button>
            </template>
        </template>
    </Dialog>
</template>
