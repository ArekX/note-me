<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import MoreMenu, { type MoreMenuAction } from "./MoreMenu.vue";
import TreeItemEditor from "./TreeItemEditor.vue";
import TreeItemIcon from "./TreeItemIcon.vue";
import TreeWindow, { type TreeWindowType } from "./TreeWindow.vue";
import {
    closeAllPopovers,
    isPopoverOpen,
} from "@/composables/useSinglePopover";
import { useActiveNote } from "@/composables/useActiveNote";
import { useOpenNote } from "@/composables/useOpenNote";
import { isDragJustFinished, treeDragState } from "@/composables/useTreeDrag";
import { redirectTo } from "@/lib/redirect";
import { useSearchStore } from "@/stores/search";
import { useTreeStore, type TreeNode } from "@/stores/tree";

const props = defineProps<{ node: TreeNode }>();

const isActiveNote = useActiveNote();
const router = useRouter();
const openNote = useOpenNote();
const treeStore = useTreeStore();
const search = useSearchStore();

const windowType = ref<TreeWindowType | null>(null);

const isOpen = computed(() => treeStore.isOpen(props.node.key));
const isEditing = computed(() => treeStore.isEditing(props.node.key));
const isProcessing = computed(() => treeStore.isProcessing(props.node.key));
const popoverId = computed(() => `tree-${props.node.key}`);

const isActive = computed(
    () => props.node.type === "note" && isActiveNote(props.node.id),
);

const isSelectedGroup = computed(
    () =>
        props.node.type === "group" && treeStore.selectedKey === props.node.key,
);

const newNoteInGroup = () =>
    router.push(redirectTo.newNote({ groupId: props.node.id }));

const handleClick = () => {
    if (isDragJustFinished()) {
        return;
    }

    treeStore.select(props.node.key);

    if (props.node.type === "note") {
        void openNote(redirectTo.viewNote({ noteId: props.node.id! }));
        return;
    }

    if (props.node.has_children) {
        void treeStore.toggle(props.node.key);
        closeAllPopovers();
    }
};

const editNote = () =>
    router.push(redirectTo.editNote({ noteId: props.node.id! }));

const handleAction = (action: MoreMenuAction) => {
    closeAllPopovers();
    switch (action) {
        case "add-note":
            void newNoteInGroup();
            break;
        case "add-group":
            void treeStore.startNewGroup(props.node.key);
            break;
        case "refresh":
            void treeStore.refresh(props.node.key);
            break;
        case "search-group":
            search.setGroup({ id: props.node.id!, name: props.node.name });
            break;
        case "rename":
            treeStore.startEdit(props.node.key);
            break;
        case "move":
        case "delete":
        case "details":
        case "remind":
        case "share":
            windowType.value = action;
            break;
    }
};

const confirmDelete = () => {
    windowType.value = null;
    if (props.node.id !== null) {
        void treeStore.deleteGroup(props.node.id);
    }
};
</script>

<template>
    <div
        :data-tree-key="node.key"
        :class="[
            'group-item-container select-none',
            treeDragState.targetKey.value === node.key
                ? 'bg-accent-soft ring-1 ring-inset ring-accent'
                : '',
        ]"
        @click.stop="handleClick"
    >
        <div
            :class="[
                'relative group-item',
                isActive
                    ? 'bg-sky-700/50'
                    : isSelectedGroup
                      ? 'bg-surface-2'
                      : 'hover:bg-surface-2',
                isPopoverOpen(popoverId) ? 'opened-menu' : '',
            ]"
            :title="node.name"
            :data-drag-handle="node.id !== null && !isEditing ? '' : undefined"
        >
            <div
                v-if="!isEditing && !isProcessing"
                class="absolute right-0 flex items-center group-item-actions pr-1"
            >
                <span
                    v-if="node.type === 'group'"
                    class="hover:text-fg text-muted cursor-pointer"
                    title="Add Note"
                    @click.stop="newNoteInGroup"
                >
                    <Icon name="plus" />
                </span>
                <span
                    v-if="node.type === 'note'"
                    class="hover:text-fg text-muted cursor-pointer"
                    title="Open Note"
                    @click.stop="editNote"
                >
                    <Icon name="pencil" />
                </span>
                <MoreMenu
                    :node="node"
                    :popover-id="popoverId"
                    @action="handleAction"
                />
            </div>
            <div
                v-if="isProcessing"
                class="absolute inset-y-0 right-0 flex items-center pl-2 pr-2 text-muted"
            >
                <Icon name="loader-alt" animation="spin" />
            </div>
            <TreeItemEditor v-if="isEditing" :node="node" />
            <span v-else class="group-item-name px-2">
                <TreeItemIcon
                    add-class="pt-0.5"
                    :node="node"
                    :is-open="isOpen"
                />
                {{ " " }}
                <span class="name-text">{{ node.name }}</span>
            </span>
        </div>
        <div v-if="isOpen" class="group-item-children">
            <TreeItem
                v-for="child in treeStore.childrenOf(node.key)"
                :key="child.key"
                :node="child"
            />
        </div>
        <TreeWindow
            v-if="windowType"
            :node="node"
            :window-type="windowType"
            @close="windowType = null"
            @confirm-delete="confirmDelete"
        />
    </div>
</template>
