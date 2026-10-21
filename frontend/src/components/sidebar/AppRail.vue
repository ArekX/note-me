<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import Logo from "@/components/Logo.vue";
import UnreadBadge from "@/components/notifications/UnreadBadge.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { useProtectionToggle } from "@/composables/useProtectionToggle";
import { useSidebar, type SidebarSection } from "@/composables/useSidebar";
import { pickSections } from "@/lib/navigation";
import { useAiStore } from "@/stores/ai";
import { useNotificationsStore } from "@/stores/notifications";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useUserStore } from "@/stores/user";
import UserMenu from "./UserMenu.vue";

const sidebar = useSidebar();
const notifications = useNotificationsStore();
const protectionLock = useProtectionLockStore();
const userStore = useUserStore();
const toggleLock = useProtectionToggle();
const ai = useAiStore();

const sections = computed(() =>
    pickSections([
        "notes",
        "search",
        "reminders",
        "shared",
        "recycleBin",
        ...(ai.access.enabled ? (["ai"] as const) : []),
    ]),
);

const isCurrent = (key: SidebarSection) =>
    sidebar.isPanelOpen.value && sidebar.section.value === key;

const accountOpen = ref(false);
</script>

<template>
    <nav class="rail glass">
        <RouterLink
            :to="{ name: 'dashboard' }"
            class="rail-item mb-2"
            aria-label="Home"
        >
            <Logo white :size="26" />
            <span class="rail-tip">Home</span>
        </RouterLink>
        <button
            v-for="item in sections"
            :key="item.key"
            type="button"
            class="rail-item"
            :aria-current="isCurrent(item.key)"
            :aria-label="item.label"
            @click="sidebar.pick(item.key)"
        >
            <Icon :name="item.icon" size="xl" />
            <span class="rail-tip">{{ item.label }}</span>
        </button>

        <div class="grow"></div>

        <button
            type="button"
            class="rail-item"
            :aria-label="
                protectionLock.isLocked
                    ? 'Unlock protected notes'
                    : 'Lock protected notes'
            "
            @click="toggleLock"
        >
            <Icon
                :name="protectionLock.isLocked ? 'lock-alt' : 'lock-open-alt'"
                size="xl"
            />
            <span class="rail-tip">{{
                protectionLock.isLocked
                    ? "Unlock protected notes"
                    : "Lock protected notes"
            }}</span>
        </button>
        <button
            type="button"
            class="rail-item"
            :aria-current="isCurrent('notifications')"
            aria-label="Notifications"
            @click="sidebar.pick('notifications')"
        >
            <Icon
                name="bell"
                :type="notifications.unreadCount > 0 ? 'solid' : 'regular'"
                size="xl"
            />
            <span class="rail-tip">Notifications</span>
            <UnreadBadge class="rail-badge" />
        </button>
        <div class="relative">
            <button
                type="button"
                class="rail-avatar"
                :aria-label="userStore.user?.name"
                @click="accountOpen = !accountOpen"
            >
                <UserAvatar class="size-full" />
                <span v-if="!accountOpen" class="rail-tip">{{
                    userStore.user?.name
                }}</span>
            </button>
            <template v-if="accountOpen">
                <div
                    class="fixed inset-0 z-40"
                    @click="accountOpen = false"
                ></div>
                <div
                    class="absolute left-full bottom-0 ml-3 z-50 w-64 py-1 px-1 rounded-[10px] bg-menu border border-line-strong shadow-float"
                >
                    <UserMenu @done="accountOpen = false" />
                </div>
            </template>
        </div>
    </nav>
</template>

<style scoped>
.rail {
    position: relative;
    z-index: 30;
    width: 3.75rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0;
    background: var(--color-rail);
    border-right: 1px solid var(--color-line);
}

.rail-item {
    position: relative;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--color-muted);
    cursor: pointer;
    transition:
        background-color 0.15s,
        color 0.15s;
}

.rail-item:hover {
    background: var(--color-surface-2);
    color: var(--color-fg);
}

.rail-item[aria-current="true"] {
    background: var(--color-accent-soft);
    color: var(--color-fg);
}

.rail-item[aria-current="true"]::before {
    content: "";
    position: absolute;
    left: -0.5rem;
    top: 25%;
    bottom: 25%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--color-accent);
}

.rail-badge {
    top: 0.125rem;
    right: 0.125rem;
}

.rail-avatar {
    position: relative;
    width: 2.5rem;
    height: 2.5rem;
    margin-top: 0.25rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: box-shadow 0.15s;
}

.rail-avatar:hover {
    box-shadow: 0 0 0 2px var(--color-accent);
}

.rail-tip {
    position: absolute;
    left: calc(100% + 0.875rem);
    top: 50%;
    translate: -0.25rem -50%;
    padding: 0.3125rem 0.625rem;
    border-radius: 6px;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-fg);
    background: oklch(0.2 0.03 270 / 0.95);
    border: 1px solid var(--color-line-strong);
    box-shadow: var(--shadow-float);
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 0.12s,
        translate 0.12s;
}

.rail-item:hover .rail-tip,
.rail-item:focus-visible .rail-tip,
.rail-avatar:hover .rail-tip,
.rail-avatar:focus-visible .rail-tip {
    opacity: 1;
    translate: 0 -50%;
    transition-delay: 0.3s;
}
</style>
