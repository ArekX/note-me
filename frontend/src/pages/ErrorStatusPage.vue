<script setup lang="ts">
import { computed } from "vue";
import ErrorPage from "@/components/ErrorPage.vue";

// The server sends browser navigations here (a file link or a download
// opened in a tab) and the router sends failed page loads; the text is fixed
// per status, so a crafted link cannot show its own message.
const props = defineProps<{ status: string }>();

const pages: Record<string, { title: string; message: string }> = {
    "403": {
        title: "Permission Denied",
        message: "You do not have permission to open this page or file.",
    },
    "404": {
        title: "Page not found",
        message: "The page or file you were looking for doesn't exist.",
    },
    "500": {
        title: "Internal Server Error",
        message:
            "Something went wrong while processing the request. Please try again later.",
    },
};

const page = computed(() => pages[props.status] ?? pages["500"]!);
</script>

<template>
    <ErrorPage
        :status="Number(status) || 500"
        :title="page.title"
        :message="page.message"
    />
</template>
