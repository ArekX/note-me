<script setup lang="ts">
import { computed, ref } from "vue";
import { useActiveNote } from "@/composables/useActiveNote";
import { useOpenNote } from "@/composables/useOpenNote";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NoteWindow from "@/components/notes/NoteWindow.vue";
import TreeItemIcon from "@/components/tree/TreeItemIcon.vue";
import { redirectTo } from "@/lib/redirect";
import { noteNode } from "@/stores/tree";
import { useUserStore } from "@/stores/user";
import type { ReminderNoteRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{
        record: ReminderNoteRecord;
        addClass?: string;
        hideReminderButton?: boolean;
    }>(),
    { addClass: "", hideReminderButton: false },
);

defineSlots<{ buttons?(): unknown }>();

const userStore = useUserStore();
const open = useOpenNote();
const isActiveNote = useActiveNote();
const isReminderWindowOpen = ref(false);

const iconNode = computed(() =>
    noteNode({ ...props.record, id: props.record.note_id }),
);

const isOwn = computed(() => props.record.author_id === userStore.user?.id);

const isActive = computed(() =>
    isActiveNote(props.record.note_id, !isOwn.value),
);

const openNote = () =>
    open(
        isOwn.value
            ? redirectTo.viewNote({ noteId: props.record.note_id })
            : redirectTo.viewSharedNote({ noteId: props.record.note_id }),
    );
</script>

<template>
    <div
        :class="[
            isActive ? 'bg-sky-700/50' : 'hover:bg-surface-2',
            'cursor-pointer items-center flex group',
            addClass,
        ]"
        @click="openNote"
    >
        <div class="grow min-w-0 flex items-start gap-3 px-3 py-2.5">
            <TreeItemIcon :node="iconNode" add-class="shrink-0 text-muted" />
            <div class="min-w-0">
                <div class="truncate">{{ record.title }}</div>
                <div class="text-xs text-muted">
                    <span title="Reminder at">
                        <Icon name="alarm" size="sm" />
                    </span>
                    {{ " " }}
                    <TimeAgo :time="record.next_at" />
                </div>
            </div>
        </div>
        <div class="max-lg:hidden text-right hidden group-hover:lg:block pr-2">
            <Button
                v-if="!hideReminderButton"
                color="primary"
                title="Edit reminder"
                @click.stop="isReminderWindowOpen = true"
            >
                <Icon name="alarm" size="sm" />
            </Button>
            <slot name="buttons" />
        </div>
        <NoteWindow
            v-if="isReminderWindowOpen"
            type="remind"
            :note-id="record.note_id"
            @close="isReminderWindowOpen = false"
        />
    </div>
</template>
