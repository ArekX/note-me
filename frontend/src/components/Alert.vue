<script setup lang="ts">
import Callout from "./Callout.vue";

withDefaults(defineProps<{ message?: string }>(), { message: "" });
</script>

<template>
    <Callout v-if="message" tone="danger" role="alert" class="mb-5">
        {{ message }}
    </Callout>
</template>
