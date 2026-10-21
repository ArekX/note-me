<script setup lang="ts">
import DashboardCard from "./DashboardCard.vue";
import { onMounted, ref } from "vue";
import SharedNoteItem from "@/components/sidebar/shared/SharedNoteItem.vue";
import { useLoader } from "@/composables/useLoader";
import { useDataChanges } from "@/composables/useDataChanges";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindSharedNotesMessage,
    FindSharedNotesResponse,
} from "@/types/messages";
import type { UserSharedNoteMeta } from "@/types/records";

const { sendMessage } = useWebsocketService();
const loader = useLoader(true);
const records = ref<UserSharedNoteMeta[]>([]);

const fetchNotes = loader.wrap(async () => {
    const response = await sendMessage<
        FindSharedNotesMessage,
        FindSharedNotesResponse
    >("notes", "findSharedNotes", {
        data: { filters: { limit: 5 } },
        expect: "findSharedNotesResponse",
    });
    records.value = response.records;
});

useDataChanges(["note", "share"], fetchNotes, { responses: false });

onMounted(fetchNotes);
</script>

<template>
    <DashboardCard
        title="Recently Shared with Me"
        icon="share-alt"
        :is-loading="loader.running.value"
        :is-empty="records.length === 0"
        @refresh="fetchNotes"
    >
        <template #empty>No shared notes yet.</template>
        <SharedNoteItem
            v-for="record in records"
            :key="record.share_id"
            add-class="rounded-lg"
            :record="record"
        />
    </DashboardCard>
</template>
