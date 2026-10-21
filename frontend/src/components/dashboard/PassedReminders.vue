<script setup lang="ts">
import DashboardCard from "./DashboardCard.vue";
import { computed } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import ReminderItem from "@/components/sidebar/reminders/ReminderItem.vue";
import { useLoader } from "@/composables/useLoader";
import { useNotificationsStore } from "@/stores/notifications";
import type { ReminderNoteRecord } from "@/types/records";

// Reads the notifications store, which
// holds the same getMyNotifications list the original requested again.
const store = useNotificationsStore();
const loader = useLoader();

const reminders = computed(() =>
    store.notifications
        .flatMap((notification) =>
            notification.data.type === "reminder-received"
                ? [{ notification, payload: notification.data.payload }]
                : [],
        )
        .sort((a, b) => a.notification.created_at - b.notification.created_at)
        .map(({ notification, payload }) => ({
            notificationId: notification.id,
            record: {
                id: payload.id,
                note_id: payload.id,
                title: payload.title,
                is_encrypted: payload.is_encrypted,
                author_id: payload.user_id,
                author_name: payload.user_name,
                type: "once",
                done_count: 1,
                repeat_count: 0,
                next_at: notification.created_at,
            } satisfies ReminderNoteRecord,
        })),
);

const refresh = loader.wrap(() => store.load());
</script>

<template>
    <DashboardCard
        title="Passed reminders"
        icon="history"
        :is-loading="loader.running.value || !store.isLoaded"
        :is-empty="reminders.length === 0"
        @refresh="refresh"
    >
        <template #empty>No passed reminders.</template>
        <ReminderItem
            v-for="reminder in reminders"
            :key="reminder.notificationId"
            add-class="rounded-lg"
            hide-reminder-button
            :record="reminder.record"
        >
            <template #buttons>
                <Button
                    color="success"
                    title="Mark as done and remove"
                    @click.stop="store.remove(reminder.notificationId)"
                >
                    <Icon name="check" size="sm" />
                </Button>
            </template>
        </ReminderItem>
    </DashboardCard>
</template>
