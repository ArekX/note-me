<script setup lang="ts">
import { useHelpStore, type HelpPage } from "@/stores/help";

const props = withDefaults(
    defineProps<{ page?: HelpPage; disableUnderline?: boolean }>(),
    { page: "general", disableUnderline: false },
);
const emit = defineEmits<{ opened: [] }>();

const help = useHelpStore();

const open = () => {
    help.open(props.page);
    emit("opened");
};
</script>

<template>
    <span
        :class="['cursor-pointer', disableUnderline ? '' : 'underline']"
        @click="open"
    >
        <slot />
    </span>
</template>
