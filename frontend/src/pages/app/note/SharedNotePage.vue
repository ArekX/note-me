<script setup lang="ts">
import { computed, ref, watch } from "vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import ViewNote from "@/components/notes/ViewNote.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { socketErrorMessage } from "@/lib/error-messages";
import type {
    GetSharedNoteMessage,
    GetSharedNoteResponse,
} from "@/types/messages";
import type { PublicSharedNote, ViewNoteRecord } from "@/types/records";

const props = defineProps<{ id: string }>();

const { sendMessage } = useWebsocketService();
const loader = useLoader(true);
const note = ref<PublicSharedNote | null>(null);
const error = ref("");
// ViewNote copies its record, so a reload re-keys it.
const version = ref(0);

const record = computed<ViewNoteRecord | null>(() =>
    note.value ? { ...note.value, group_id: null, group_name: null } : null,
);

const load = async () => {
    try {
        const response = await sendMessage<
            GetSharedNoteMessage,
            GetSharedNoteResponse
        >("notes", "getSharedNote", {
            data: { id: Number(props.id) },
            expect: "getSharedNoteResponse",
        });
        note.value = response.record;
        error.value = "";
        version.value++;
    } catch (loadError) {
        note.value = null;
        error.value = socketErrorMessage(loadError);
    }
};

watch(
    () => props.id,
    () =>
        loader.run(async () => {
            note.value = null;
            error.value = "";
            await load();
        }),
    { immediate: true },
);

// The owner's edits, deletes and an unshare reload the note in place.
useDataChanges(["note", "share"], load, {
    responses: false,
    matches: (ids) => ids.includes(Number(props.id)),
});
</script>

<template>
    <Skeleton v-if="loader.running.value" variant="note" />
    <NoItemMessage v-else-if="error" icon="error">{{ error }}</NoItemMessage>
    <ViewNote
        v-else-if="record"
        :key="`${record.id}-${version}`"
        :record="record"
        readonly
        share-mode="users"
        :author="note!.user_name"
    />
</template>
