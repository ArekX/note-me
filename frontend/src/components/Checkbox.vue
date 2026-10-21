<script setup lang="ts">
defineProps<{ label: string }>();

const checked = defineModel<boolean>({ default: false });
</script>

<template>
    <div class="inline-block">
        <label class="cursor-pointer inline-flex items-center gap-2 min-h-8">
            <input
                v-model="checked"
                class="size-4 accent-accent cursor-pointer"
                type="checkbox"
            />
            {{ label }}
        </label>
    </div>
</template>
