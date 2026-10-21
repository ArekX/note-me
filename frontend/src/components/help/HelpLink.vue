<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";
import { useHelpStore } from "@/stores/help";

// A link from a help page to an app page; following it closes the help.
defineProps<{ to: RouteLocationRaw }>();

const help = useHelpStore();
</script>

<template>
    <RouterLink :to="to" class="link" @click="help.close()">
        <slot />
    </RouterLink>
</template>
