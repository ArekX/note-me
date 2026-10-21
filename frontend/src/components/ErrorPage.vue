<script setup lang="ts">
import { getCurrentMonthWallpaper } from "@/lib/wallpaper";
import { useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import Logo from "@/components/Logo.vue";
import { useUserStore } from "@/stores/user";

// The status, a title, and for errors other than 404 the
// reason in a message box.
defineProps<{ status: number; title: string; message?: string }>();

defineSlots<{ default?(): unknown }>();

const router = useRouter();
const userStore = useUserStore();

const homeRoute = () => ({
    name: userStore.isLoggedIn ? "dashboard" : "login",
});

// A deep link opened in a new tab has no in-app page to go back to.
const goBack = () => {
    if (window.history.state?.back) {
        router.back();
        return;
    }
    void router.push(homeRoute());
};
</script>

<template>
    <div
        class="h-screen flex items-center justify-center p-4 text-fg app-backdrop"
        :style="{ '--wallpaper': `url(${getCurrentMonthWallpaper()})` }"
    >
        <div class="flex flex-col items-center text-center max-w-screen-md">
            <Logo white :size="72" />

            <p class="mt-6 text-7xl font-bold tracking-tight">{{ status }}</p>
            <h1 class="mt-2 text-2xl font-semibold">{{ title }}</h1>
            <p v-if="$slots.default" class="mt-3 text-muted">
                <slot />
            </p>
            <div
                v-if="message"
                data-test="error-message"
                class="border py-2 px-8 my-4 rounded-lg border-danger/40 bg-danger-soft"
            >
                <p class="my-4">{{ message }}</p>
            </div>

            <div class="mt-8 flex flex-wrap justify-center gap-2">
                <Button color="primary" @click="goBack">
                    <Icon name="arrow-back" size="lg" class-name="mr-1" /> Go
                    back
                </Button>
                <RouterLink v-if="userStore.isLoggedIn" :to="homeRoute()">
                    <Button color="success">
                        <Icon name="home" size="lg" class-name="mr-1" />
                        Dashboard
                    </Button>
                </RouterLink>
            </div>
        </div>
    </div>
</template>
