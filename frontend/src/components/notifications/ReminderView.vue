<script setup lang="ts">
import { useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import { closeAllPopovers } from "@/composables/useSinglePopover";
import { redirectTo } from "@/lib/redirect";
import type { NotificationNoteReminderData } from "@/types/records";

const props = defineProps<{ data: NotificationNoteReminderData }>();

const router = useRouter();

const openNote = () => {
    void router.push(
        props.data.type === "own"
            ? redirectTo.viewNote({ noteId: props.data.id })
            : redirectTo.viewSharedNote({ noteId: props.data.id }),
    );
    closeAllPopovers();
};
</script>

<template>
    <div class="p-4 rounded-md">
        <h3 class="text-sm font-bold mb-2">
            Reminder for note "{{ data.title }}" from {{ data.user_name }}
        </h3>
        <div>
            <Button color="success" size="xs" @click="openNote">View</Button>
        </div>
    </div>
</template>
