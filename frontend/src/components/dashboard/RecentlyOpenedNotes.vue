<script setup lang="ts">
import DashboardCard from "./DashboardCard.vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NoteRow from "@/components/notes/NoteRow.vue";
import { useLoader } from "@/composables/useLoader";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { useDataChanges } from "@/composables/useDataChanges";
import { redirectTo } from "@/lib/redirect";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";
import type { RecentNoteRecord } from "@/types/records";

const router = useRouter();
const notesStore = useNotesStore();
const timeFormat = useTimeFormat();
const loader = useLoader(true);

const records = ref<RecentNoteRecord[]>([]);

const fetchNotes = () =>
    loader.run(async () => {
        try {
            records.value = await notesStore.getRecentlyOpened();
        } catch (error) {
            useToastStore().reportError(error);
        }
    });

useDataChanges(["note"], fetchNotes);

onMounted(fetchNotes);
</script>

<template>
    <DashboardCard
        title="Recently Opened Notes"
        icon="show"
        :is-loading="loader.running.value"
        :is-empty="records.length === 0"
        @refresh="fetchNotes"
    >
        <template #empty>No notes found.</template>
        <NoteRow
            v-for="note in records"
            :key="note.id"
            :note="note"
            add-class="rounded-md"
            @click="router.push(redirectTo.viewNote({ noteId: note.id }))"
        >
            <span
                class="block truncate"
                :title="
                    note.last_open_at
                        ? timeFormat.formatDateTime(note.last_open_at)
                        : ''
                "
            >
                <Icon name="show" size="sm" />
                <TimeAgo :time="note.last_open_at" />
            </span>
            <span
                class="block truncate"
                :title="timeFormat.formatDateTime(note.updated_at)"
            >
                <Icon name="pencil" size="sm" />
                <TimeAgo :time="note.updated_at" />
            </span>
        </NoteRow>
    </DashboardCard>
</template>
