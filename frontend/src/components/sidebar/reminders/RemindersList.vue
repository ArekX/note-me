<script setup lang="ts">
import SidebarList from "@/components/sidebar/SidebarList.vue";
import ReminderItem from "./ReminderItem.vue";
import { useLoadMore } from "@/composables/useLoadMore";
import { useDataChanges } from "@/composables/useDataChanges";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
} from "@/types/messages";
import type { ReminderNoteRecord } from "@/types/records";

const REMINDERS_PAGE_SIZE = 10;

const list = useLoadMore<ReminderNoteRecord>({
    limit: REMINDERS_PAGE_SIZE,
    onLoadMore: async (last) => {
        const { records } = await sendMessage<
            FindNoteRemindersMessage,
            FindNoteRemindersResponse
        >("notes", "findNoteReminders", {
            data: {
                filters: {
                    fromNextAt: last?.next_at ?? 0,
                    fromId: last?.id ?? 0,
                    limit: REMINDERS_PAGE_SIZE,
                },
            },
            expect: "findNoteRemindersResponse",
        });
        return records;
    },
});

const { sendMessage } = useWebsocketService();
useDataChanges(["note", "reminder"], list.reload);
</script>

<template>
    <SidebarList
        :list="list"
        empty-icon="alarm"
        :record-key="(record) => record.id"
    >
        <template #switcher><slot name="switcher" /></template>
        <template #search><slot name="search" /></template>
        <template #empty>No reminders currently set.</template>
        <template #default="{ record }">
            <ReminderItem :record="record" />
        </template>
    </SidebarList>
</template>
