<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        variant?: "text" | "list" | "note";
        count?: number;
    }>(),
    { variant: "text", count: undefined },
);

const defaultCounts = { text: 3, list: 4, note: 3 } as const;

const total = computed(() => props.count ?? defaultCounts[props.variant]);

const lineWidths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3"];
const widthOf = (index: number) =>
    total.value > 1 && index === total.value - 1
        ? "w-3/5"
        : lineWidths[index % lineWidths.length];
</script>

<template>
    <div role="status" aria-busy="true" aria-label="Loading">
        <div v-if="variant === 'text'" class="flex flex-col gap-2">
            <span
                v-for="(_, index) in total"
                :key="index"
                :class="['skeleton h-3.5', widthOf(index)]"
            />
        </div>
        <div v-else-if="variant === 'list'" class="flex flex-col">
            <div
                v-for="(_, index) in total"
                :key="index"
                class="flex items-center gap-3 px-3 py-2"
            >
                <span class="skeleton size-8 shrink-0 rounded-lg" />
                <div class="grow flex flex-col gap-1.5">
                    <span
                        :class="[
                            'skeleton h-3.5',
                            index % 2 ? 'w-1/2' : 'w-2/3',
                        ]"
                    />
                    <span class="skeleton h-2.5 w-1/3" />
                </div>
            </div>
        </div>
        <div v-else class="flex flex-col gap-6">
            <span class="skeleton h-7 w-1/2" />
            <div
                v-for="(_, index) in total"
                :key="index"
                class="flex flex-col gap-2"
            >
                <span class="skeleton h-3.5 w-full" />
                <span class="skeleton h-3.5 w-11/12" />
                <span class="skeleton h-3.5 w-4/5" />
                <span class="skeleton h-3.5 w-2/5" />
            </div>
        </div>
    </div>
</template>
