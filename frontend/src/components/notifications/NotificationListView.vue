<script setup lang="ts">
import { computed } from "vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import SwitcherContainer from "@/components/sidebar/SwitcherContainer.vue";
import NotificationItem from "./NotificationItem.vue";
import { useNotificationsStore } from "@/stores/notifications";

const store = useNotificationsStore();
const notifications = computed(() => store.notifications);
</script>

<template>
    <SwitcherContainer
        :icons="
            notifications.length === 0
                ? []
                : [
                      ...(store.unreadCount > 0
                          ? [
                                {
                                    name: 'Mark all as read',
                                    icon: 'check-double',
                                    onClick: () => store.markAllRead(),
                                },
                            ]
                          : []),
                      {
                          name: 'Delete all',
                          icon: 'trash',
                          onClick: () => store.removeAll(),
                      },
                  ]
        "
    >
        Notifications
        <span v-if="store.unreadCount > 0" class="text-muted font-normal">
            ({{ store.unreadCount }})
        </span>
    </SwitcherContainer>
    <Skeleton v-if="!store.isLoaded" variant="list" :count="4" />
    <div v-else-if="notifications.length > 0" class="grow overflow-auto">
        <NotificationItem
            v-for="notification in notifications"
            :key="notification.id"
            :notification="notification"
            @mark-read="store.markRead(notification.id)"
            @delete="store.remove(notification.id)"
        />
    </div>
    <NoItemMessage v-else icon="smile">
        No notifications. All clear!
    </NoItemMessage>
</template>
