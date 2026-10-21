<script setup lang="ts">
import ErrorPage from "@/components/ErrorPage.vue";
</script>

<template>
    <ErrorPage :status="404" title="Page not found">
        The page you were looking for doesn't exist.
    </ErrorPage>
</template>
