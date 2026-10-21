<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import Skeleton from "@/components/Skeleton.vue";
import HelpWindow from "@/components/help/HelpWindow.vue";
import EncryptionLockWindow from "@/components/encryption/EncryptionLockWindow.vue";
import AiPasswordDialog from "@/components/ai/AiPasswordDialog.vue";
import DataExportDialogs from "@/components/data/DataExportDialogs.vue";
import ProtectedNotesConsentDialog from "@/components/ai/ProtectedNotesConsentDialog.vue";
import AppTopBar from "@/components/AppTopBar.vue";
import AppRail from "@/components/sidebar/AppRail.vue";
import PhoneTabBar from "@/components/sidebar/PhoneTabBar.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import { useMobileMenu } from "@/composables/useMobileMenu";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useSidebar } from "@/composables/useSidebar";
import { getCurrentMonthWallpaper } from "@/lib/wallpaper";
import type { UserFrontendResponse } from "@/types/messages";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useUserStore } from "@/stores/user";
import { useSocketStore } from "@/stores/socket";
import { useNotificationsStore } from "@/stores/notifications";
import { useAiStore } from "@/stores/ai";
import { useProtectionLockStore } from "@/stores/protection-lock";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const socketStore = useSocketStore();
const notificationsStore = useNotificationsStore();

const isInitialized = ref(false);
provide("hasTopBar", true);
const query = useResponsiveQuery();
const mobileMenu = useMobileMenu();
const sidebar = useSidebar();
const wallpaper = `url(${getCurrentMonthWallpaper()})`;
const shellBars = ["w-32", "w-40", "w-24", "w-36", "w-28", "w-44"];

watch(
    () => route.fullPath,
    () => mobileMenu.close(),
);

useProtectionLockStore().init();

useWebsocketService<UserFrontendResponse>({
    users: {
        forceLogoutResponse: () => {
            void router.push({ name: "logout" });
        },
        sessionUpdated: ({ user, permissions, required_steps }) => {
            userStore.setSession({ user, permissions, required_steps });
            // Re-runs the guard: a new required step or lost settings access
            // redirects right away.
            void router.replace({ path: route.fullPath, force: true });
        },
    },
});

const isSidebarAllowed = computed(() => route.name !== "reset-password");

// The server rejects the websocket while a required step is pending.
const canConnect = computed(
    () => userStore.isLoggedIn && userStore.requiredSteps.length === 0,
);

const start = async () => {
    try {
        await socketStore.connect();
        isInitialized.value = true;
        await notificationsStore.load();
        await useAiStore().init();
    } catch {
        // Connection errors are reported through the toast store.
    }
};

watch(
    canConnect,
    (allowed) => {
        if (allowed && !isInitialized.value) {
            void start();
        }
    },
    { immediate: true },
);
</script>

<template>
    <div
        class="app-backdrop flex h-dvh text-fg"
        :style="{ '--wallpaper': wallpaper }"
    >
        <template v-if="isSidebarAllowed && !query.isMobile()">
            <AppRail />
            <div
                v-if="sidebar.isPanelOpen.value"
                class="w-72 shrink-0 bg-surface glass border-r border-line"
            >
                <Sidebar />
            </div>
        </template>
        <div class="flex-1 min-w-0 flex flex-col">
            <AppTopBar
                v-if="isSidebarAllowed"
                v-show="!(query.isMobile() && mobileMenu.isMenuOpen.value)"
            />
            <div class="relative flex-1 min-h-0">
                <div
                    class="h-full overflow-auto flex flex-col"
                    :inert="mobileMenu.isMenuOpen.value || undefined"
                >
                    <div
                        v-if="canConnect && !isInitialized"
                        class="fixed inset-0 z-50 flex app-backdrop"
                    >
                        <template v-if="isSidebarAllowed && !query.isMobile()">
                            <div
                                class="w-15 shrink-0 flex flex-col items-center gap-2 py-3 bg-rail"
                            >
                                <span
                                    v-for="index in 5"
                                    :key="index"
                                    class="skeleton size-9 rounded-lg"
                                />
                            </div>
                            <div
                                class="w-72 shrink-0 py-2 bg-surface border-r border-line"
                            >
                                <div
                                    v-for="(width, index) in shellBars"
                                    :key="index"
                                    class="flex items-center gap-2 h-10 px-3"
                                >
                                    <span class="skeleton size-4 rounded" />
                                    <span :class="['skeleton h-3.5', width]" />
                                </div>
                            </div>
                        </template>
                        <div class="flex-1 min-w-0 flex flex-col">
                            <div
                                class="h-14 shrink-0 flex items-center px-6 bg-bar border-b border-line"
                            >
                                <span class="skeleton h-3.5 w-40" />
                            </div>
                            <div
                                class="grow bg-surface px-10 pt-6 max-md:px-4 max-md:pt-4"
                            >
                                <Skeleton
                                    variant="note"
                                    aria-label="Loading application"
                                />
                            </div>
                        </div>
                    </div>
                    <RouterView />
                </div>
                <div
                    v-if="
                        isSidebarAllowed &&
                        query.isMobile() &&
                        mobileMenu.isMenuOpen.value
                    "
                    class="absolute inset-0 z-20 app-backdrop"
                >
                    <Sidebar />
                </div>
            </div>
            <PhoneTabBar v-if="isSidebarAllowed && query.isMobile()" />
        </div>
        <EncryptionLockWindow />
        <ProtectedNotesConsentDialog />
        <AiPasswordDialog />
        <DataExportDialogs />
        <HelpWindow />
    </div>
</template>
