<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import SwitcherContainer from "@/components/sidebar/SwitcherContainer.vue";
import { treeDragState } from "@/composables/useTreeDrag";
import { redirectTo } from "@/lib/redirect";
import { ROOT_KEY, useTreeStore } from "@/stores/tree";

const router = useRouter();
const treeStore = useTreeStore();

const target = computed(() => {
    const key = treeStore.targetGroupKey;
    const node = key === ROOT_KEY ? undefined : treeStore.nodes[key];
    return { key, id: node?.id ?? null, name: node?.name ?? null };
});

const icons = computed(() => [
    {
        name: target.value.name
            ? `Add note in ${target.value.name}`
            : "Add note",
        icon: "plus",
        onClick: () =>
            router.push(redirectTo.newNote({ groupId: target.value.id })),
    },
    {
        name: target.value.name
            ? `Add group in ${target.value.name}`
            : "Add group",
        icon: "folder-plus",
        onClick: () => treeStore.startNewGroup(target.value.key),
    },
    { name: "Reload", icon: "refresh", onClick: () => treeStore.reloadRoot() },
]);
</script>

<template>
    <SwitcherContainer
        :icons="icons"
        :add-class="
            treeDragState.targetKey.value === ROOT_KEY ? 'bg-accent-soft' : ''
        "
    >
        <div
            v-if="treeDragState.sourceKey.value"
            class="pl-2 py-1 max-lg:text-xs"
        >
            Top Level
        </div>
        <slot v-else />
    </SwitcherContainer>
</template>
