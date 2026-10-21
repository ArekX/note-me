<script setup lang="ts">
import { useToastStore } from "@/stores/toast";
import Icon from "./Icon.vue";
import IconButton from "@/components/IconButton.vue";

const toast = useToastStore();

const typeIcons = {
    warning: { icon: "error", color: "text-warning" },
    success: { icon: "check-circle", color: "text-success" },
    info: { icon: "info-circle", color: "text-accent" },
    error: { icon: "error-circle", color: "text-danger" },
} as const;
</script>

<template>
    <div
        class="toast-messages absolute bottom-5 right-5 max-md:left-3 max-md:right-3 max-md:bottom-20 lg:w-96 z-[80] flex flex-col gap-2"
    >
        <div
            v-for="message in toast.messages"
            :key="message.id"
            :class="[
                'flex items-center gap-3 py-2 pl-3.5 pr-2 rounded-xl glass-menu text-fg text-sm',
            ]"
            data-test="toast"
        >
            <Icon
                :name="typeIcons[message.type].icon"
                size="xl"
                :class-name="typeIcons[message.type].color"
            />
            <div class="grow">
                {{ message.text }}
            </div>
            <IconButton
                icon="x"
                title="Dismiss"
                @click="toast.removeMessage(message.id)"
            />
        </div>
    </div>
</template>
