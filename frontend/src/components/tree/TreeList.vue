<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import DeleteGroupProgressDialog from "./DeleteGroupProgressDialog.vue";
import RootGroupBar from "./RootGroupBar.vue";
import TreeItem from "./TreeItem.vue";
import { useTreeDrag } from "@/composables/useTreeDrag";
import { ROOT_KEY, useTreeStore } from "@/stores/tree";

const treeStore = useTreeStore();

const tree = ref<HTMLElement | null>(null);
const topLevel = ref<HTMLElement | null>(null);

useTreeDrag(tree, topLevel);

const skeletonWidths = ["w-32", "w-40", "w-24", "w-36", "w-28", "w-44", "w-20"];

onMounted(() => treeStore.init());
</script>

<template>
    <div ref="topLevel">
        <RootGroupBar>
            <slot name="switcher" />
        </RootGroupBar>
    </div>
    <slot name="search" />

    <div
        class="grow overflow-auto content-sidebar"
        @click.self="treeStore.select(null)"
    >
        <div ref="tree" class="note-container">
            <div
                v-if="treeStore.isRootLoading"
                role="status"
                aria-busy="true"
                aria-label="Loading notes and groups"
            >
                <div
                    v-for="(width, index) in skeletonWidths"
                    :key="index"
                    class="flex items-center gap-2 h-10 px-2"
                >
                    <span class="skeleton size-4 rounded" />
                    <span :class="['skeleton h-3.5', width]" />
                </div>
            </div>
            <template v-else>
                <RouterLink
                    v-if="
                        treeStore.nodes[ROOT_KEY]!.children_loaded &&
                        treeStore.nodes[ROOT_KEY]!.children.length === 0
                    "
                    :to="{ name: 'note-new' }"
                    class="block cursor-pointer"
                >
                    <NoItemMessage icon="note">
                        Add your first note with <Icon name="plus" />!
                    </NoItemMessage>
                </RouterLink>
                <TreeItem
                    v-for="child in treeStore.childrenOf(ROOT_KEY)"
                    :key="child.key"
                    :node="child"
                />
            </template>
        </div>
    </div>

    <DeleteGroupProgressDialog v-if="treeStore.deletingGroupId !== null" />
</template>
