<script setup lang="ts">
import { nowUnix, toUnix } from "@/lib/unix-time";
import Button from "@/components/Button.vue";

const emit = defineEmits<{ presetSelected: [nextAt: number] }>();

const nextWeekday = (weekday: number) => {
    const now = new Date();
    const days = (weekday + 7 - now.getDay()) % 7 || 7;
    return toUnix(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + days),
    );
};

const presets: { title: string; nextAt: () => number }[] = [
    { title: "In 5 minutes", nextAt: () => nowUnix() + 300 },
    { title: "In 30 minutes", nextAt: () => nowUnix() + 1800 },
    { title: "In 1 hour", nextAt: () => nowUnix() + 3600 },
    { title: "In 3 hours", nextAt: () => nowUnix() + 10800 },
    { title: "In 1 day", nextAt: () => nowUnix() + 86400 },
    { title: "In 3 days", nextAt: () => nowUnix() + 259200 },
    { title: "In a week", nextAt: () => nowUnix() + 604800 },
    { title: "In a month", nextAt: () => nowUnix() + 2592000 },
    { title: "Next monday", nextAt: () => nextWeekday(1) },
    { title: "Next wednesday", nextAt: () => nextWeekday(3) },
    { title: "Next friday", nextAt: () => nextWeekday(5) },
    {
        title: "End of this month",
        nextAt: () => {
            const now = new Date();
            return toUnix(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        },
    },
    {
        title: "Start of next month",
        nextAt: () => {
            const now = new Date();
            return toUnix(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        },
    },
];
</script>

<template>
    <div class="py-2">When should we remind you?</div>
    <div
        class="grid lg:grid-cols-3 lg:gap-2 md:grid-cols-2 md:gap-1 max-md:grid-cols-1"
    >
        <Button
            v-for="preset in presets"
            :key="preset.title"
            color="success"
            add-class="max-md:mb-2"
            @click="emit('presetSelected', preset.nextAt())"
        >
            {{ preset.title }}
        </Button>
    </div>
</template>
