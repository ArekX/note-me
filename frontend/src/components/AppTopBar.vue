<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import Icon from "./Icon.vue";
import { useMobileMenu } from "@/composables/useMobileMenu";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useSidebar } from "@/composables/useSidebar";
import {
    TOP_BAR_ACTIONS_ID,
    useTopBar,
    type Crumb,
} from "@/composables/useTopBar";
import { profileTabs } from "@/lib/navigation";
import { settingsTabs } from "@/lib/settings-tabs";

const noteRoutes = new Set([
    "note-view",
    "note-edit",
    "note-shared",
    "note-new",
]);

const route = useRoute();
const query = useResponsiveQuery();
const topBar = useTopBar();
const sidebar = useSidebar();
const mobileMenu = useMobileMenu();

const crumbs = computed((): readonly Crumb[] => {
    if (topBar.crumbs.value) {
        return topBar.crumbs.value;
    }
    const name = String(route.name ?? "");
    if (name === "dashboard") {
        return [{ label: "Home" }];
    }
    const settingsTab = settingsTabs.find((tab) => tab.route === name);
    if (settingsTab) {
        return [
            { label: "Administration", to: { name: "settings" } },
            { label: settingsTab.name },
        ];
    }
    const profileTab = profileTabs.find((tab) => tab.route === name);
    if (profileTab) {
        return [
            { label: "Profile", to: { name: "profile" } },
            { label: profileTab.name },
        ];
    }
    return route.meta.title ? [{ label: route.meta.title }] : [];
});

const pageTitle = computed(() => {
    const last = crumbs.value.at(-1)?.label;
    return last === "Editing" ? crumbs.value.at(-2)?.label : last;
});

const showBack = computed(
    () => query.isMobile() && noteRoutes.has(String(route.name)),
);

const backToNotes = () => {
    sidebar.show("notes");
    mobileMenu.open();
};
</script>

<template>
    <header class="top-bar glass">
        <button
            v-if="showBack"
            type="button"
            class="size-11 -ml-2 grid place-items-center rounded-lg text-fg hover:bg-surface-2 cursor-pointer"
            title="Back to notes"
            @click="backToNotes"
        >
            <Icon name="chevron-left" size="2xl" />
        </button>
        <nav
            v-if="!query.isMobile()"
            class="flex items-center gap-1 min-w-0 grow text-sm text-muted"
            aria-label="Breadcrumb"
        >
            <template v-for="(crumb, index) in crumbs" :key="index">
                <Icon
                    v-if="index > 0"
                    name="chevron-right"
                    size="lg"
                    class-name="shrink-0"
                />
                <RouterLink
                    v-if="crumb.to && index < crumbs.length - 1"
                    :to="crumb.to"
                    class="crumb crumb-link"
                    >{{ crumb.label }}</RouterLink
                >
                <button
                    v-else-if="crumb.onClick && index < crumbs.length - 1"
                    type="button"
                    class="crumb crumb-link"
                    :title="
                        crumb.icon === 'folder'
                            ? `Search in ${crumb.label}`
                            : undefined
                    "
                    @click="crumb.onClick"
                >
                    <Icon
                        v-if="crumb.icon"
                        :name="crumb.icon"
                        size="sm"
                        class-name="mr-1"
                    />{{ crumb.label }}
                </button>
                <span
                    v-else
                    :class="[
                        'crumb',
                        index === crumbs.length - 1 ? 'text-fg' : '',
                    ]"
                    >{{ crumb.label }}</span
                >
            </template>
        </nav>
        <span v-else class="grow min-w-0 truncate font-semibold">
            {{ pageTitle }}
        </span>
        <div
            :id="TOP_BAR_ACTIONS_ID"
            class="flex items-center gap-2 shrink-0"
        ></div>
    </header>
</template>

<style scoped>
.top-bar {
    height: 3.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem 0 1.5rem;
    background: var(--color-bar);
    border-bottom: 1px solid var(--color-line);
    position: relative;
    z-index: 10;
}

.crumb {
    min-width: 0;
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.125rem 0.375rem;
    border-radius: 6px;
}

.crumb-link {
    cursor: pointer;
}

.crumb-link:hover {
    color: var(--color-fg);
    background: var(--color-surface-2);
}

@media (max-width: 767px) {
    .top-bar {
        padding: 0 0.5rem 0 1rem;
    }
}
</style>
