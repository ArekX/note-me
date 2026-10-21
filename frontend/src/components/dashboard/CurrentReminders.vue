<script setup lang="ts">
import DashboardCard from "./DashboardCard.vue";
import { onMounted, ref } from "vue";
import ReminderItem from "@/components/sidebar/reminders/ReminderItem.vue";
import { useLoader } from "@/composables/useLoader";
import { useDataChanges } from "@/composables/useDataChanges";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    NotificationFrontendResponse,
} from "@/types/messages";
import type { ReminderNoteRecord } from "@/types/records";

const loader = useLoader(true);
const records = ref<ReminderNoteRecord[]>([]);

const fetchReminders = loader.wrap(async () => {
    const response = await sendMessage<
        FindNoteRemindersMessage,
        FindNoteRemindersResponse
    >("notes", "findNoteReminders", {
        data: { filters: { limit: 5 } },
        expect: "findNoteRemindersResponse",
    });
    records.value = response.records;
});

const { sendMessage } = useWebsocketService<NotificationFrontendResponse>({
    notifications: {
        notificationAdded: ({ record }) => {
            if (record.data.type === "reminder-received") {
                const reminderId = record.data.payload.reminder_id;
                records.value = records.value.filter(
                    (r) => r.id !== reminderId,
                );
            }
        },
    },
});

useDataChanges(["note", "reminder"], fetchReminders);

onMounted(fetchReminders);
</script>

<template>
    <DashboardCard
        title="Current reminders"
        icon="alarm"
        :is-loading="loader.running.value"
        :is-empty="records.length === 0"
        :count="records.length"
        @refresh="fetchReminders"
    >
        <template #empty>No reminders set.</template>
        <ReminderItem
            v-for="record in records"
            :key="record.id"
            add-class="rounded-lg"
            :record="record"
        />
    </DashboardCard>
</template>
