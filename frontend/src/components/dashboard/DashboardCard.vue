<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import Skeleton from "@/components/Skeleton.vue";

withDefaults(
    defineProps<{
        title: string;
        icon: string;
        isLoading?: boolean;
        isEmpty?: boolean;
        count?: number;
    }>(),
    { isLoading: false, isEmpty: false, count: 0 },
);
const emit = defineEmits<{ refresh: [] }>();
</script>

<template>
    <section class="glass-card p-2">
        <header class="flex items-center justify-between h-10 pl-3 pr-1">
            <h2 class="flex items-center gap-2 font-semibold">
                <Icon :name="icon" size="lg" class-name="text-muted" />
                {{ title }}
            </h2>
            <span
                v-if="count > 0"
                class="ml-auto mr-1 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-accent text-accent-ink text-xs font-semibold"
                >{{ count }}</span
            >
            <button
                v-if="!isLoading"
                type="button"
                class="size-8 grid place-items-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 cursor-pointer"
                title="Refresh"
                @click="emit('refresh')"
            >
                <Icon name="refresh" size="lg" />
            </button>
        </header>
        <div class="text-sm">
            <Skeleton v-if="isLoading" variant="list" :count="3" />
            <div v-else-if="isEmpty" class="text-muted px-3 pb-3">
                <slot name="empty" />
            </div>
            <slot v-else />
        </div>
    </section>
</template>
