<script setup lang="ts">
import IconButton from "./IconButton.vue";
import { useHelpStore, type HelpPage } from "@/stores/help";

const props = defineProps<{ title: string; help?: HelpPage }>();

const openHelp = () => useHelpStore().open(props.help);
</script>

<template>
    <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div class="min-w-0">
            <div class="flex items-center gap-1">
                <h2 class="text-xl font-semibold">{{ title }}</h2>
                <IconButton
                    v-if="help"
                    icon="help-circle"
                    title="Help"
                    @click="openHelp"
                />
            </div>
            <div
                v-if="$slots.default"
                class="text-sm text-muted mt-1 max-w-[70ch]"
            >
                <slot />
            </div>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>
