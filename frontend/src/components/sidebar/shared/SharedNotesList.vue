<script setup lang="ts">
import SidebarList from "@/components/sidebar/SidebarList.vue";
import SharedNoteItem from "./SharedNoteItem.vue";
import { useLoadMore } from "@/composables/useLoadMore";
import { useDataChanges } from "@/composables/useDataChanges";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindSharedNotesMessage,
    FindSharedNotesResponse,
} from "@/types/messages";
import type { UserSharedNoteMeta } from "@/types/records";

// The original asked for 5 and expected
// 10 per page, so it never paged (0.46).
const SHARED_PAGE_SIZE = 10;

const list = useLoadMore<UserSharedNoteMeta>({
    limit: SHARED_PAGE_SIZE,
    onLoadMore: async (last) => {
        const { records } = await sendMessage<
            FindSharedNotesMessage,
            FindSharedNotesResponse
        >("notes", "findSharedNotes", {
            data: {
                filters: {
                    fromCreatedAt: last?.created_at,
                    fromShareId: last?.share_id,
                    limit: SHARED_PAGE_SIZE,
                },
            },
            expect: "findSharedNotesResponse",
        });
        return records;
    },
});

const { sendMessage } = useWebsocketService();
useDataChanges(["note", "share"], list.reload, { responses: false });
</script>

<template>
    <SidebarList
        :list="list"
        empty-icon="share-alt"
        :record-key="(record) => record.share_id"
    >
        <template #switcher><slot name="switcher" /></template>
        <template #search><slot name="search" /></template>
        <template #empty>No notes currently shared with you.</template>
        <template #default="{ record }">
            <SharedNoteItem :record="record" />
        </template>
    </SidebarList>
</template>
