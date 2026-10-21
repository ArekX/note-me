<script setup lang="ts">
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import GroupDetails from "@/components/groups/GroupDetails.vue";
import MoveGroupDialog from "@/components/groups/MoveGroupDialog.vue";
import NoteWindow from "@/components/notes/NoteWindow.vue";
import type { TreeNode } from "@/stores/tree";

export type TreeWindowType = "move" | "delete" | "details" | "remind" | "share";

defineProps<{ node: TreeNode; windowType: TreeWindowType }>();
const emit = defineEmits<{ close: []; confirmDelete: [] }>();
</script>

<template>
    <NoteWindow
        v-if="node.type === 'note' && node.id !== null"
        :type="windowType"
        :note-id="node.id"
        :is-protected="node.is_protected"
        @close="emit('close')"
    />
    <Teleport v-else-if="node.type === 'group' && node.id !== null" to="body">
        <MoveGroupDialog
            v-if="windowType === 'move'"
            :record-id="node.id"
            record-type="group"
            @close="emit('close')"
        />
        <ConfirmDialog
            v-else-if="windowType === 'delete'"
            prompt="Are you sure you want to delete this group?"
            confirm-text="Delete group"
            confirm-color="danger"
            @confirm="emit('confirmDelete')"
            @cancel="emit('close')"
        />
        <GroupDetails
            v-else-if="windowType === 'details'"
            :group-id="node.id"
            @close="emit('close')"
        />
    </Teleport>
</template>
