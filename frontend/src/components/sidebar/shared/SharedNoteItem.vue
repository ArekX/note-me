<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NoteRow from "@/components/notes/NoteRow.vue";
import { useActiveNote } from "@/composables/useActiveNote";
import { useOpenNote } from "@/composables/useOpenNote";
import { redirectTo } from "@/lib/redirect";
import type { UserSharedNoteMeta } from "@/types/records";

withDefaults(defineProps<{ record: UserSharedNoteMeta; addClass?: string }>(), {
    addClass: "",
});

const openNote = useOpenNote();
const isActive = useActiveNote();
</script>

<template>
    <NoteRow
        :note="record"
        :active="isActive(record.id, true)"
        :add-class="addClass"
        @click="openNote(redirectTo.viewSharedNote({ noteId: record.id }))"
    >
        <span class="block truncate">
            <Icon name="share-alt" size="sm" /> by {{ record.user_name }}
        </span>
        <span class="block truncate">
            <Icon name="time-five" size="sm" />
            <TimeAgo :time="record.created_at" />
        </span>
    </NoteRow>
</template>
