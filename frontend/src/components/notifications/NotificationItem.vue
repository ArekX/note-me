<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NotificationSharedView from "./NotificationSharedView.vue";
import ReminderView from "./ReminderView.vue";
import type { NotificationRecord } from "@/types/records";

defineProps<{ notification: NotificationRecord }>();
const emit = defineEmits<{ markRead: []; delete: [] }>();
</script>

<template>
    <div
        :class="[
            notification.is_read ? '' : 'bg-accent-soft/40',
            'relative flex border-b border-line',
        ]"
    >
        <span
            v-if="!notification.is_read"
            class="absolute left-1.5 top-4 size-1.5 rounded-full bg-accent"
        ></span>
        <div class="grow min-w-0">
            <ReminderView
                v-if="notification.data.type === 'reminder-received'"
                :data="notification.data.payload"
            />
            <NotificationSharedView
                v-else-if="notification.data.type === 'note-shared'"
                :data="notification.data.payload"
            />
            <div class="text-xs text-muted px-3 pb-3">
                <TimeAgo :time="notification.created_at" />
            </div>
        </div>
        <div class="flex items-start gap-0.5 pt-2 pr-1.5 shrink-0">
            <IconButton
                v-if="!notification.is_read"
                icon="check"
                title="Mark as read"
                @click="emit('markRead')"
            />
            <IconButton icon="trash" title="Delete" @click="emit('delete')" />
        </div>
    </div>
</template>
