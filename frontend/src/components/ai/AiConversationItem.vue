<script setup lang="ts">
import { ref } from "vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useAiStore } from "@/stores/ai";
import { useToastStore } from "@/stores/toast";
import type { AiConversationRecord } from "@/types/records";

const props = defineProps<{ record: AiConversationRecord }>();

const ai = useAiStore();
const toastStore = useToastStore();
const isRenaming = ref(false);
const isConfirmingDelete = ref(false);
const title = ref("");

const vFocus = { mounted: (element: HTMLElement) => element.focus() };

const open = async () => {
    try {
        await ai.open(props.record.id);
    } catch (error) {
        toastStore.reportError(error);
    }
};

const startRename = () => {
    title.value = props.record.title;
    isRenaming.value = true;
};

const saveRename = async () => {
    if (!isRenaming.value) {
        return;
    }
    isRenaming.value = false;
    if (title.value.trim() === props.record.title) {
        return;
    }
    try {
        await ai.rename(props.record.id, title.value);
    } catch (error) {
        toastStore.reportError(error);
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        void saveRename();
    } else if (event.key === "Escape") {
        isRenaming.value = false;
    }
};

const confirmDelete = async () => {
    isConfirmingDelete.value = false;
    try {
        await ai.remove(props.record.id);
    } catch (error) {
        toastStore.reportError(error);
    }
};
</script>

<template>
    <div
        class="group flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-2"
        @click="isRenaming || open()"
    >
        <Icon name="chat" size="xl" class-name="shrink-0 text-muted" />
        <div class="grow min-w-0">
            <input
                v-if="isRenaming"
                v-model="title"
                v-focus
                class="w-full rounded bg-surface-2 border border-line px-1.5 text-sm"
                aria-label="Conversation title"
                @click.stop
                @keydown="handleKeydown"
                @blur="saveRename"
            />
            <div v-else class="truncate">{{ record.title }}</div>
            <div class="text-xs text-muted truncate">
                <TimeAgo :time="record.updated_at" />
            </div>
        </div>
        <div
            class="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
            @click.stop
        >
            <IconButton icon="pencil" title="Rename" @click="startRename" />
            <IconButton
                icon="trash"
                title="Delete"
                danger
                @click="isConfirmingDelete = true"
            />
        </div>
        <ConfirmDialog
            v-if="isConfirmingDelete"
            prompt="Delete this conversation? This cannot be undone."
            confirm-text="Delete"
            confirm-color="danger"
            @confirm="confirmDelete"
            @cancel="isConfirmingDelete = false"
        />
    </div>
</template>
