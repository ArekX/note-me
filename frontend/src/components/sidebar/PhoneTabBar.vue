<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BottomSheet from "@/components/BottomSheet.vue";
import Icon from "@/components/Icon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import UnreadBadge from "@/components/notifications/UnreadBadge.vue";
import { useMobileMenu } from "@/composables/useMobileMenu";
import { useSidebar, type SidebarSection } from "@/composables/useSidebar";
import { pickSections } from "@/lib/navigation";
import { useUserStore } from "@/stores/user";
import UserMenu from "./UserMenu.vue";

const route = useRoute();
const router = useRouter();
const mobileMenu = useMobileMenu();
const sidebar = useSidebar();
const userStore = useUserStore();

const moreOpen = ref(false);

const tabs = pickSections(["notes", "search", "notifications"]);

const openSection = (section: SidebarSection) => {
    moreOpen.value = false;
    sidebar.show(section);
    mobileMenu.open();
};

const goHome = () => {
    mobileMenu.close();
    void router.push({ name: "dashboard" });
};
</script>

<template>
    <nav class="tab-bar glass">
        <button
            type="button"
            class="tab"
            aria-label="Home"
            :aria-current="
                !mobileMenu.isMenuOpen.value && route.name === 'dashboard'
            "
            @click="goHome"
        >
            <span class="tab-pill"><Icon name="home-alt-2" size="2xl" /></span>
        </button>
        <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="tab"
            :aria-label="tab.label"
            :aria-current="
                mobileMenu.isMenuOpen.value && sidebar.section.value === tab.key
            "
            @click="openSection(tab.key)"
        >
            <span class="tab-pill"><Icon :name="tab.icon" size="2xl" /></span>
            <UnreadBadge v-if="tab.key === 'notifications'" class="tab-badge" />
        </button>
        <button
            type="button"
            class="tab"
            :aria-label="userStore.user?.name ?? 'Account'"
            :aria-current="moreOpen"
            @click="moreOpen = true"
        >
            <span class="tab-pill">
                <UserAvatar class="size-7 text-[11px]" />
            </span>
        </button>
    </nav>
    <BottomSheet :open="moreOpen" @close="moreOpen = false">
        <div class="px-2">
            <UserMenu phone @done="moreOpen = false" @section="openSection" />
        </div>
    </BottomSheet>
</template>

<style scoped>
.tab-bar {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding-bottom: env(safe-area-inset-bottom);
    background: oklch(0.11 0.03 272 / 0.7);
    border-top: 1px solid var(--color-line);
}

.tab {
    position: relative;
    height: 3.5rem;
    display: grid;
    place-items: center;
    color: var(--color-muted);
    cursor: pointer;
}

.tab-pill {
    padding: 0.375rem 1.25rem;
    border-radius: 6px;
    transition: background-color 0.2s;
}

.tab[aria-current="true"] {
    color: var(--color-fg);
}

.tab[aria-current="true"] .tab-pill {
    background: var(--color-accent-soft);
}

.tab-badge {
    top: 0.5rem;
    left: 50%;
    margin-left: 0.5rem;
}
</style>
