<script setup lang="ts">
import { useNotificationsStore } from "@/stores/notifications";

const notifications = useNotificationsStore();
</script>

<template>
    <span v-if="notifications.unreadCount > 0" class="unread-badge">
        {{ notifications.unreadCount > 9 ? "9+" : notifications.unreadCount }}
    </span>
</template>

<style scoped>
.unread-badge {
    position: absolute;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    font-size: 0.625rem;
    line-height: 1rem;
    font-weight: 700;
    color: white;
    background: var(--color-danger);
    box-shadow: 0 0 0 2px var(--color-night);
}
</style>
