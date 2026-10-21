<script setup lang="ts">
import { computed, ref, watch } from "vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import LockedContentWrapper from "@/components/encryption/LockedContentWrapper.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { socketErrorMessage } from "@/lib/error-messages";
import { useNotesStore } from "@/stores/notes";
import { useSocketStore } from "@/stores/socket";
import type { NoteFrontendResponse } from "@/types/messages";
import type { ViewNoteRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{ id: number; markOpened?: boolean }>(),
    { markOpened: false },
);

// version changes when the note is replaced, so the page can re-key its
// editor or viewer; reload fetches the stored note again in place.
defineSlots<{
    default(props: {
        record: ViewNoteRecord;
        version: number;
        reload: () => Promise<void>;
    }): unknown;
}>();

const notesStore = useNotesStore();
const socketStore = useSocketStore();
const loader = useLoader(true);
const record = ref<ViewNoteRecord | null>(null);
const error = ref("");
const version = ref(0);
const records = computed(() => (record.value ? [record.value] : []));

const load = (id: number) =>
    loader.run(async () => {
        record.value = null;
        error.value = "";
        try {
            record.value = await notesStore.getNote(id, props.markOpened);
        } catch (loadError) {
            error.value = socketErrorMessage(loadError);
        }
    });

watch(() => props.id, load, { immediate: true });

const reload = async () => {
    try {
        record.value = await notesStore.getNote(props.id, false);
        version.value++;
    } catch (loadError) {
        record.value = null;
        error.value = socketErrorMessage(loadError);
    }
};

useWebsocketService<NoteFrontendResponse>({
    notes: {
        // A revert from elsewhere goes to the editor or viewer, which may
        // have to keep unsaved edits.
        revertNoteToHistoryResponse: (response) => {
            if (
                record.value &&
                response.note_id === record.value.id &&
                socketStore.isOwnRequest(response.requestId)
            ) {
                record.value = {
                    ...record.value,
                    note: response.note,
                    title: response.title,
                    tags: response.tags,
                    is_encrypted: response.is_encrypted,
                };
                version.value++;
            }
        },
    },
});
</script>

<template>
    <Skeleton v-if="loader.running.value" variant="note" />
    <NoItemMessage v-else-if="error" icon="error">{{ error }}</NoItemMessage>
    <LockedContentWrapper
        v-else-if="record"
        :records="records"
        :protected-keys="['note']"
        is-locked-key="is_encrypted"
    >
        <template #default="{ records: [unlocked] }">
            <slot :record="unlocked!" :version="version" :reload="reload" />
        </template>
    </LockedContentWrapper>
</template>
