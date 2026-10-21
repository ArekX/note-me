<script setup lang="ts">
import Button, { type ButtonColor } from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";

withDefaults(defineProps<{ color?: ButtonColor }>(), { color: "primary" });

const emit = defineEmits<{ filesSelected: [files: File[]] }>();

const change = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
        emit("filesSelected", files);
    }
    input.value = "";
};
</script>

<template>
    <Button add-class="relative" :color="color" title="Upload files...">
        <Icon name="cloud-upload" size="lg" />
        Upload
        <input
            class="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer"
            type="file"
            title="Upload files..."
            multiple
            @change="change"
            @click.stop
        />
    </Button>
</template>
