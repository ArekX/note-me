<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { getCurrentMonthWallpaper } from "@/lib/wallpaper";
import ToastMessages from "@/components/ToastMessages.vue";

const route = useRoute();

const wallpaper = computed(() =>
    route.meta.wallpaper ? getCurrentMonthWallpaper() : null,
);

const pageTitle = computed(() =>
    route.meta.title ? `NoteMe - ${route.meta.title}` : "NoteMe",
);

watch(pageTitle, (title) => (document.title = title), { immediate: true });

watch(
    () => route.meta.allowScrolling === true,
    (allow) => document.body.classList.toggle("allow-scrolling", allow),
    { immediate: true },
);

watch(
    wallpaper,
    (url) => {
        document.body.style.backgroundImage = url ? `url(${url})` : "";
    },
    { immediate: true },
);
</script>

<template>
    <RouterView />
    <ToastMessages />
</template>
