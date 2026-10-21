<script setup lang="ts">
import FormField from "@/components/FormField.vue";
import IconButton from "@/components/IconButton.vue";
import { useToastStore } from "@/stores/toast";

const props = withDefaults(
    defineProps<{ label: string; value: string; multiline?: boolean }>(),
    { multiline: false },
);

const toastStore = useToastStore();

// The clipboard API is only there on https or localhost.
const copy = async () => {
    try {
        await navigator.clipboard.writeText(props.value);
        toastStore.addMessage({
            type: "success",
            text: `${props.label} copied to clipboard.`,
        });
    } catch {
        toastStore.addMessage({
            type: "error",
            text: "Could not copy. Select the text and copy it yourself.",
        });
    }
};
</script>

<template>
    <FormField :label="label">
        <div
            class="flex items-start gap-2 rounded-md border border-line bg-surface-2 pl-3 pr-1 py-1"
        >
            <pre
                v-if="multiline"
                class="grow min-w-0 overflow-x-auto py-1 text-xs"
                >{{ value }}</pre>
            <code
                v-else
                class="grow min-w-0 break-all py-1.5 text-xs select-all"
                >{{ value }}</code
            >
            <IconButton
                icon="copy"
                :title="`Copy ${label.toLowerCase()}`"
                @click="copy"
            />
        </div>
    </FormField>
</template>
