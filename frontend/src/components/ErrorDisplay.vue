<script setup lang="ts">
import { computed } from "vue";
import type { ValidationState } from "@/composables/useValidation";

const props = defineProps<{
    state: ValidationState;
    path: string;
}>();

const messages = computed(() =>
    props.state.errors.value
        .filter((error) => error.path.join(".") === props.path)
        .map((error) => error.message),
);
</script>

<template>
    <div v-if="messages.length > 0" class="text-danger">
        <div v-for="(message, index) in messages" :key="index">
            {{ message }}
        </div>
    </div>
</template>
