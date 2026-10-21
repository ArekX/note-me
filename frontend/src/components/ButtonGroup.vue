<script setup lang="ts" generic="Id extends string">
import Icon from "./Icon.vue";

withDefaults(
    defineProps<{
        items: { id: Id; name: string; icon?: string }[];
        activeItem?: Id | null;
        size?: "sm" | "md";
        stretchOnMobile?: boolean;
        // Shows each item's icon with its name as the title.
        iconsOnly?: boolean;
    }>(),
    {
        activeItem: null,
        size: "md",
        stretchOnMobile: true,
        iconsOnly: false,
    },
);

const emit = defineEmits<{ select: [id: Id] }>();
</script>

<template>
    <div
        :class="[
            'inline-flex gap-0.5 p-[3px] rounded-[11px] bg-surface-2 border border-line overflow-x-auto',
            stretchOnMobile ? 'max-md:flex max-md:w-full' : '',
        ]"
        role="group"
    >
        <button
            v-for="item in items"
            :key="item.id"
            type="button"
            :aria-pressed="activeItem === item.id"
            :class="[
                'rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
                iconsOnly ? 'px-2' : 'px-3',
                size === 'sm' ? 'h-7' : 'h-8',
                stretchOnMobile ? 'max-md:flex-1' : '',
                activeItem === item.id
                    ? 'bg-fg text-accent-ink pointer-events-none'
                    : 'text-muted hover:text-fg',
            ]"
            :title="iconsOnly ? item.name : undefined"
            :aria-label="iconsOnly ? item.name : undefined"
            @click.prevent="activeItem !== item.id && emit('select', item.id)"
        >
            <Icon v-if="iconsOnly" :name="item.icon ?? ''" size="lg" />
            <template v-else>{{ item.name }}</template>
        </button>
    </div>
</template>
