<script setup lang="ts">
import { computed } from "vue";
import DropdownMenu from "@/components/DropdownMenu.vue";
import {
    useResponsiveQuery,
    type ResponsiveSize,
} from "@/composables/useResponsiveQuery";

export type MoreMenuMode =
    "view" | "view-readonly" | "edit-new" | "edit-existing";

export type MoreMenuAction =
    | "preview"
    | "open-viewer"
    | "open-editor"
    | "editor-save"
    | "editor-toggle-protection"
    | "edit"
    | "details"
    | "history"
    | "remind"
    | "share"
    | "files"
    | "download"
    | "move"
    | "delete"
    | "help";

interface MoreMenuItem {
    name: string;
    icon: string;
    maxSize?: ResponsiveSize;
    modes: MoreMenuMode[];
    action: MoreMenuAction;
}

const props = withDefaults(
    defineProps<{
        mode: MoreMenuMode;
        inPreviewMode: boolean;
        isProtected?: boolean;
    }>(),
    { isProtected: false },
);
const emit = defineEmits<{ action: [action: MoreMenuAction] }>();

const query = useResponsiveQuery();

const items = computed(() =>
    (
        [
            {
                name: "Save",
                icon: "save",
                maxSize: "lg",
                modes: ["edit-new", "edit-existing"],
                action: "editor-save",
            },
            {
                name: "Close",
                icon: "minus-circle",
                maxSize: "lg",
                modes: ["edit-existing"],
                action: "open-viewer",
            },
            {
                name: props.isProtected ? "Unprotect" : "Protect",
                icon: props.isProtected ? "lock-open-alt" : "lock-alt",
                maxSize: "lg",
                modes: ["edit-existing"],
                action: "editor-toggle-protection",
            },
            {
                name: props.inPreviewMode ? "Edit mode" : "Preview mode",
                icon: props.inPreviewMode ? "pencil" : "show",
                modes: ["edit-new", "edit-existing"],
                action: props.inPreviewMode ? "edit" : "preview",
            },
            {
                name: "Edit",
                icon: "pencil",
                maxSize: "lg",
                modes: ["view"],
                action: "open-editor",
            },
            {
                name: "Details",
                icon: "detail",
                modes: ["view", "edit-existing"],
                action: "details",
            },
            {
                name: "Download",
                icon: "download",
                modes: ["view", "edit-existing", "view-readonly"],
                action: "download",
            },
            {
                name: "History",
                icon: "history",
                modes: ["view", "edit-existing"],
                action: "history",
            },
            {
                name: "Share",
                icon: "share-alt",
                modes: ["view", "edit-existing"],
                action: "share",
            },
            {
                name: "Files",
                icon: "file",
                modes: ["view", "edit-existing"],
                action: "files",
            },
            {
                name: "Remind me",
                icon: "alarm",
                modes: ["view", "edit-existing", "view-readonly"],
                action: "remind",
            },
            {
                name: "Move",
                icon: "transfer-alt",
                modes: ["view", "edit-existing"],
                action: "move",
            },
            {
                name: "Delete",
                icon: "minus-circle",
                modes: ["view", "edit-existing"],
                action: "delete",
            },
            {
                name: "Help",
                icon: "help-circle",
                modes: ["view", "edit-existing", "view-readonly", "edit-new"],
                action: "help",
            },
        ] satisfies MoreMenuItem[] as MoreMenuItem[]
    )
        .filter(
            (item) =>
                item.modes.includes(props.mode) &&
                (!item.maxSize || query.max(item.maxSize)),
        )
        .map((item) => ({
            name: item.name,
            icon: item.icon,
            onClick: () => emit("action", item.action),
        })),
);
</script>

<template>
    <DropdownMenu
        popover-id="notesMenu-0"
        icon="dots-horizontal-rounded"
        icon-size="lg"
        display-type="inline"
        button-border-class="border"
        button-size="sm"
        add-button-class="inline-block"
        :items="items"
    />
</template>
