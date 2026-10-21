<script setup lang="ts">
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { useProtectionToggle } from "@/composables/useProtectionToggle";
import type { SidebarSection } from "@/composables/useSidebar";
import { pickSections, profileTabs } from "@/lib/navigation";
import { roleDefinitions } from "@/lib/rbac";
import { computed } from "vue";
import { useAiStore } from "@/stores/ai";
import { useHelpStore } from "@/stores/help";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useUserStore } from "@/stores/user";

withDefaults(defineProps<{ phone?: boolean }>(), { phone: false });
const emit = defineEmits<{ done: []; section: [section: SidebarSection] }>();

const userStore = useUserStore();
const protectionLock = useProtectionLockStore();
const help = useHelpStore();
const toggleLock = useProtectionToggle();

const ai = useAiStore();

const lists = computed(() =>
    pickSections([
        "reminders",
        "shared",
        "recycleBin",
        ...(ai.access.enabled ? (["ai"] as const) : []),
    ]),
);

const openHelp = () => {
    help.open();
    emit("done");
};

const lock = () => {
    void toggleLock();
    emit("done");
};
</script>

<template>
    <div :class="['user-menu', phone ? 'text-base' : 'text-sm']">
        <div class="flex items-center gap-3 px-3 py-2">
            <UserAvatar :class="phone ? 'size-11' : 'size-9 text-xs'" />
            <div class="min-w-0">
                <div class="font-semibold truncate">
                    {{ userStore.user?.name }}
                </div>
                <div class="text-xs text-muted truncate">
                    @{{ userStore.user?.username }}
                    <template v-if="userStore.user">
                        · {{ roleDefinitions[userStore.user.role].name }}
                    </template>
                </div>
            </div>
        </div>
        <button
            type="button"
            :class="['menu-row w-full', phone ? 'h-12' : 'h-9']"
            @click="lock"
        >
            <Icon
                :name="protectionLock.isLocked ? 'lock-alt' : 'lock-open-alt'"
                size="xl"
            />
            <span class="grow text-left">
                {{ protectionLock.isLocked ? "Unlock" : "Lock" }}
            </span>
            <span
                :class="[
                    'text-xs px-1.5 rounded',
                    protectionLock.isLocked
                        ? 'bg-surface-2 text-muted'
                        : 'bg-success-soft text-success',
                ]"
                >{{ protectionLock.isLocked ? "Locked" : "Open" }}</span
            >
        </button>
        <template v-if="phone">
            <div class="menu-sep"></div>
            <button
                v-for="item in lists"
                :key="item.key"
                type="button"
                class="menu-row w-full h-12"
                @click="emit('section', item.key)"
            >
                <Icon :name="item.icon" size="xl" />
                {{ item.label }}
            </button>
        </template>
        <div class="menu-sep"></div>
        <RouterLink
            v-for="item in profileTabs"
            :key="item.route"
            :to="{ name: item.route }"
            :class="['menu-row', phone ? 'h-12' : 'h-9']"
            @click="emit('done')"
        >
            <Icon :name="item.icon" size="xl" />
            {{ item.menuLabel }}
        </RouterLink>
        <div class="menu-sep"></div>
        <RouterLink
            v-if="userStore.canAccessSettings"
            :to="{ name: 'settings' }"
            :class="['menu-row', phone ? 'h-12' : 'h-9']"
            @click="emit('done')"
        >
            <Icon name="cog" size="xl" />
            Administration
        </RouterLink>
        <button
            type="button"
            :class="['menu-row w-full', phone ? 'h-12' : 'h-9']"
            @click="openHelp"
        >
            <Icon name="help-circle" size="xl" />
            Help
        </button>
        <div class="menu-sep"></div>
        <RouterLink
            :to="{ name: 'logout' }"
            :class="[
                'menu-row text-danger hover:!bg-danger-soft',
                phone ? 'h-12' : 'h-9',
            ]"
            @click="emit('done')"
        >
            <Icon name="log-out" size="xl" />
            Log out
        </RouterLink>
    </div>
</template>

<style scoped>
.menu-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0.75rem;
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
}

.menu-row:hover {
    background: var(--color-surface-2);
}

.menu-sep {
    height: 1px;
    margin: 0.25rem 0.5rem;
    background: var(--color-line);
}
</style>
