<script setup lang="ts">
import CurrentReminders from "@/components/dashboard/CurrentReminders.vue";
import PassedReminders from "@/components/dashboard/PassedReminders.vue";
import RecentlyOpenedNotes from "@/components/dashboard/RecentlyOpenedNotes.vue";
import RecentlySharedWithMe from "@/components/dashboard/RecentlySharedWithMe.vue";
import DashboardIntroduction from "@/components/onboarding/DashboardIntroduction.vue";
import { RouterLink } from "vue-router";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import { TOP_BAR_ACTIONS_ID } from "@/composables/useTopBar";
import { redirectTo } from "@/lib/redirect";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
});
</script>

<template>
    <div class="text-fg px-10 py-8 max-md:px-4 max-md:py-5">
        <Teleport defer :to="`#${TOP_BAR_ACTIONS_ID}`">
            <RouterLink :to="redirectTo.newNote()">
                <Button color="success" size="sm" title="New note">
                    <Icon name="plus" size="lg" />
                    <span class="max-md:hidden">New note</span>
                </Button>
            </RouterLink>
        </Teleport>
        <header class="mb-6">
            <h1 class="text-3xl font-bold tracking-tight">
                Welcome, {{ userStore.user?.name }}!
            </h1>
            <p class="text-muted mt-1">{{ today }}</p>
        </header>

        <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
            <RecentlyOpenedNotes />
            <CurrentReminders />
            <RecentlySharedWithMe />
            <PassedReminders />
        </div>
        <DashboardIntroduction />
    </div>
</template>
