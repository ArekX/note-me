<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import Loader from "@/components/Loader.vue";
import { useUserStore } from "@/stores/user";
import { useSocketStore } from "@/stores/socket";
import { useTreeStore } from "@/stores/tree";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useNotificationsStore } from "@/stores/notifications";
import { useAiStore } from "@/stores/ai";
import { clearStorage } from "@/lib/local-storage";

const router = useRouter();
const userStore = useUserStore();
const socketStore = useSocketStore();
const treeStore = useTreeStore();

onMounted(async () => {
    socketStore.disconnect();
    useProtectionLockStore().lock();
    useNotificationsStore().reset();
    useAiStore().reset();
    clearStorage();
    treeStore.reset();
    try {
        await userStore.logout();
    } catch {
        // The session is dropped locally even when the server call fails
        // (for example when the cookie has already expired).
    }
    await router.replace({ name: "login" });
});
</script>

<template>
    <div class="island-initalizer">
        <Loader>Signing out...</Loader>
    </div>
</template>
