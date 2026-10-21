<script setup lang="ts">
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";

defineProps<{ count: number; disabled: boolean }>();

const emit = defineEmits<{
    makePublic: [];
    makePrivate: [];
    delete: [];
    clear: [];
}>();
</script>

<template>
    <div
        class="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-xl border border-accent/40 bg-accent-soft"
        role="toolbar"
        aria-label="Selected files"
    >
        <span class="font-semibold text-sm mr-auto">
            {{ count }} {{ count === 1 ? "file" : "files" }} selected
        </span>
        <Button size="sm" :disabled="disabled" @click="emit('makePublic')">
            <Icon name="globe" size="lg" /> Make public
        </Button>
        <Button size="sm" :disabled="disabled" @click="emit('makePrivate')">
            <Icon name="lock-alt" size="lg" /> Make private
        </Button>
        <Button
            size="sm"
            color="danger"
            :disabled="disabled"
            @click="emit('delete')"
        >
            <Icon name="trash" size="lg" /> Delete
        </Button>
        <Button
            size="sm"
            color="transparent"
            :disabled="disabled"
            @click="emit('clear')"
        >
            <Icon name="x" size="lg" /> Clear selection
        </Button>
    </div>
</template>
