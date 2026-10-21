<script setup lang="ts">
import { ref } from "vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Loader from "@/components/Loader.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NoteRow from "@/components/notes/NoteRow.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FullyDeleteNoteMessage,
    FullyDeleteNoteResponse,
    RestoreDeletedNoteMessage,
    RestoreDeletedNoteResponse,
} from "@/types/messages";
import type { DeletedNoteRecord } from "@/types/records";

const props = defineProps<{ record: DeletedNoteRecord }>();

const DELETED_NOTE_LIFETIME = 30 * 24 * 60 * 60;

const action = ref<"restore" | "fully-delete" | null>(null);
const loader = useLoader();
const { sendMessage } = useWebsocketService();

const confirm = loader.wrap(async () => {
    if (action.value === "restore") {
        await sendMessage<
            RestoreDeletedNoteMessage,
            RestoreDeletedNoteResponse
        >("notes", "restoreDeletedNote", {
            data: { id: props.record.id },
            expect: "restoreDeletedNoteResponse",
        });
    } else {
        await sendMessage<FullyDeleteNoteMessage, FullyDeleteNoteResponse>(
            "notes",
            "fullyDeleteNote",
            {
                data: { id: props.record.id },
                expect: "fullyDeleteNoteResponse",
            },
        );
    }
    action.value = null;
});
</script>

<template>
    <NoteRow :note="record" add-class="group">
        <span class="block truncate">
            <span title="Deleted at">
                <Icon name="recycle" size="sm" />
            </span>
            <TimeAgo :time="record.deleted_at" />
        </span>
        <span class="block truncate">
            <span title="Expires at">
                <Icon name="calendar-minus" size="sm" />
            </span>
            <TimeAgo :time="(record.deleted_at ?? 0) + DELETED_NOTE_LIFETIME" />
        </span>
        <template #actions>
            <div
                class="shrink-0 flex invisible group-hover:visible max-md:visible"
            >
                <IconButton
                    icon="undo"
                    title="Restore note"
                    @click="action = 'restore'"
                />
                <IconButton
                    icon="trash"
                    title="Fully delete note"
                    danger
                    @click="action = 'fully-delete'"
                />
            </div>
            <ConfirmDialog
                v-if="action"
                :is-processing="loader.running.value"
                :confirm-text="
                    action === 'restore' ? 'Restore note' : 'Fully delete note'
                "
                :confirm-color="action === 'restore' ? 'success' : 'danger'"
                :cancel-color="'primary'"
                @cancel="action = null"
                @confirm="confirm"
            >
                <template #prompt>
                    <Loader v-if="loader.running.value" color="white">
                        {{ action === "restore" ? "Restoring" : "Deleting" }}
                        note...
                    </Loader>
                    <template v-else>
                        <div>
                            Are you sure you want to
                            {{
                                action === "fully-delete"
                                    ? "fully delete"
                                    : "restore"
                            }}
                            this note?
                        </div>
                        <div v-if="action === 'restore'">
                            <strong>Important:</strong> This note will be
                            restored to the top level of the notes. Any
                            associated groups will not be restored.
                        </div>
                        <div v-else>
                            <strong>Important:</strong> This note will be
                            permanently deleted and will no longer be
                            recoverable.
                        </div>
                    </template>
                </template>
            </ConfirmDialog>
        </template>
    </NoteRow>
</template>
