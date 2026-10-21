<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const failedUrl = ref<string | null>(null);
</script>

<template>
    <img
        v-if="
            userStore.profilePictureUrl &&
            userStore.profilePictureUrl !== failedUrl
        "
        :src="userStore.profilePictureUrl"
        alt=""
        class="shrink-0 rounded-full object-cover bg-field"
        @error="failedUrl = userStore.profilePictureUrl"
    />
    <span
        v-else
        class="grid place-items-center shrink-0 rounded-full bg-accent text-accent-ink font-bold"
        >{{ userStore.initials }}</span
    >
</template>
