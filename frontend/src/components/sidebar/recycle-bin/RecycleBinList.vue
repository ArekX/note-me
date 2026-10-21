<script setup lang="ts">
import SidebarList from "@/components/sidebar/SidebarList.vue";
import RecycleBinItem from "./RecycleBinItem.vue";
import { useLoadMore } from "@/composables/useLoadMore";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindDeletedNotesMessage,
    FindDeletedNotesResponse,
    NoteFrontendResponse,
} from "@/types/messages";
import type { DeletedNoteRecord } from "@/types/records";

const DELETED_NOTES_PAGE_SIZE = 10;

const list = useLoadMore<DeletedNoteRecord>({
    limit: DELETED_NOTES_PAGE_SIZE,
    onLoadMore: async (last) => {
        const { records } = await sendMessage<
            FindDeletedNotesMessage,
            FindDeletedNotesResponse
        >("notes", "findDeletedNotes", {
            data: { filters: { fromId: last?.id ?? 0 } },
            expect: "findDeletedNotesResponse",
        });
        return records;
    },
});

const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
    notes: {
        deleteNoteResponse: () => void list.reload(),
        restoreDeletedNoteResponse: () => void list.reload(),
        fullyDeleteNoteResponse: ({ deleted_id }) => {
            list.records.value = list.records.value.filter(
                (record) => record.id !== deleted_id,
            );
        },
    },
});
</script>

<template>
    <SidebarList
        :list="list"
        empty-icon="recycle"
        :record-key="(record) => record.id"
    >
        <template #switcher><slot name="switcher" /></template>
        <template #search><slot name="search" /></template>
        <template #empty>You have no deleted notes.</template>
        <template #default="{ record }">
            <RecycleBinItem :record="record" />
        </template>
    </SidebarList>
</template>
