<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import LockedContentWrapper from "@/components/encryption/LockedContentWrapper.vue";
import Dialog from "@/components/Dialog.vue";
import MoveGroupDialog from "@/components/groups/MoveGroupDialog.vue";
import Skeleton from "@/components/Skeleton.vue";
import NoteDelete from "./windows/NoteDelete.vue";
import NoteDetails from "./windows/NoteDetails.vue";
import NoteFiles from "./windows/NoteFiles.vue";
import NoteHistory from "./windows/NoteHistory.vue";
import NoteReminder from "./windows/NoteReminder.vue";
import NoteShare from "./windows/NoteShare.vue";
import type { NoteWindowType } from "./note-windows";
import { useLoader } from "@/composables/useLoader";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";

// Windows that read the note text, so protected notes are unlocked first.
const textWindows: NoteWindowType[] = ["details", "history", "files", "delete"];

const props = withDefaults(
    defineProps<{
        type: NoteWindowType;
        noteId: number;
        existingNoteText?: string;
        isProtected?: boolean;
    }>(),
    { existingNoteText: undefined, isProtected: false },
);
const emit = defineEmits<{ close: [] }>();

const notesStore = useNotesStore();
const loader = useLoader();
const text = ref(props.existingNoteText ?? "");
const isEncrypted = ref(false);
const records = computed(() => [
    { text: text.value, is_encrypted: isEncrypted.value },
]);

const handleUnlockFail = (reason: string) => {
    useToastStore().addMessage({
        type: "info",
        text: `Unlock failed: ${reason}`,
    });
    emit("close");
};

onMounted(() => {
    if (
        props.existingNoteText !== undefined ||
        !textWindows.includes(props.type)
    ) {
        return;
    }

    void loader.run(async () => {
        try {
            const record = await notesStore.getDetails(props.noteId, {
                include_note: true,
            });
            text.value = record.note;
            isEncrypted.value = record.is_encrypted;
        } catch (error) {
            useToastStore().reportError(error);
            emit("close");
        }
    });
});
</script>

<template>
    <Teleport to="body">
        <Dialog v-if="loader.running.value" visible>
            <Skeleton class="w-96 max-w-full" />
        </Dialog>
        <LockedContentWrapper
            v-else-if="textWindows.includes(type)"
            :records="records"
            :protected-keys="['text']"
            is-locked-key="is_encrypted"
            dialog-mode
            @unlock-fail="handleUnlockFail"
        >
            <template #default="{ records: [unlocked] }">
                <NoteDetails
                    v-if="type === 'details'"
                    :note-id="noteId"
                    :text="unlocked!.text"
                    @close="emit('close')"
                />
                <NoteHistory
                    v-else-if="type === 'history'"
                    :note-id="noteId"
                    :current-text="unlocked!.text"
                    @close="emit('close')"
                />
                <NoteFiles
                    v-else-if="type === 'files'"
                    :note-id="noteId"
                    :text="unlocked!.text"
                    @close="emit('close')"
                />
                <NoteDelete
                    v-else
                    :note-id="noteId"
                    :text="unlocked!.text"
                    @close="emit('close')"
                />
            </template>
        </LockedContentWrapper>
        <NoteShare
            v-else-if="type === 'share'"
            :note-id="noteId"
            :is-protected="isProtected"
            @close="emit('close')"
        />
        <NoteReminder
            v-else-if="type === 'remind'"
            :note-id="noteId"
            @close="emit('close')"
        />
        <MoveGroupDialog
            v-else-if="type === 'move'"
            :record-id="noteId"
            record-type="note"
            @close="emit('close')"
        />
    </Teleport>
</template>
