<script setup lang="ts">
import { computed } from "vue";
import DropdownMenu from "@/components/DropdownMenu.vue";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import type { TreeNode } from "@/stores/tree";

export type MoreMenuAction =
    | "add-note"
    | "add-group"
    | "refresh"
    | "search-group"
    | "remind"
    | "share"
    | "details"
    | "move"
    | "rename"
    | "delete";

const props = defineProps<{ node: TreeNode; popoverId: string }>();
const emit = defineEmits<{ action: [action: MoreMenuAction] }>();

const menu: {
    name: string;
    icon: string;
    types: TreeNode["type"][];
    action: MoreMenuAction;
}[] = [
    { name: "Add Note", icon: "plus", types: ["group"], action: "add-note" },
    {
        name: "Add Group",
        icon: "folder-plus",
        types: ["group"],
        action: "add-group",
    },
    {
        name: "Search",
        icon: "search",
        types: ["group"],
        action: "search-group",
    },
    { name: "Refresh", icon: "refresh", types: ["group"], action: "refresh" },
    {
        name: "Details",
        icon: "detail",
        types: ["note", "group"],
        action: "details",
    },
    { name: "Share", icon: "share-alt", types: ["note"], action: "share" },
    { name: "Remind me", icon: "alarm", types: ["note"], action: "remind" },
    {
        name: "Move",
        icon: "transfer-alt",
        types: ["group", "note"],
        action: "move",
    },
    {
        name: "Rename",
        icon: "edit",
        types: ["group", "note"],
        action: "rename",
    },
    {
        name: "Delete",
        icon: "minus-circle",
        types: ["group", "note"],
        action: "delete",
    },
];

const query = useResponsiveQuery();

const items = computed(() =>
    menu
        .filter((item) => item.types.includes(props.node.type))
        .map((item) => ({
            name: item.name,
            icon: item.icon,
            onClick: () => emit("action", item.action),
        })),
);
</script>

<template>
    <DropdownMenu
        :popover-id="popoverId"
        :show-direction="query.max('md') ? 'left' : 'right'"
        display-type="portal"
        icon-only
        icon="dots-horizontal-rounded"
        :items="items"
    />
</template>
