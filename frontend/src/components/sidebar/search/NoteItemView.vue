<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import NoteRow from "@/components/notes/NoteRow.vue";
import { useActiveNote } from "@/composables/useActiveNote";
import { findHighlightedLines } from "@/lib/text-highlight";
import type { NoteSearchRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{
        record: NoteSearchRecord;
        searchQuery: string;
        hideActiveNote?: boolean;
        addClass?: string;
    }>(),
    { hideActiveNote: false, addClass: "" },
);

const emit = defineEmits<{ noteClick: [] }>();

const isActiveNote = useActiveNote();

const foundLines = computed(() =>
    findHighlightedLines(
        props.record.is_encrypted ? "" : props.record.note,
        props.searchQuery,
        100,
    ),
);

const isActive = computed(
    () => !props.hideActiveNote && isActiveNote(props.record.id),
);
</script>

<template>
    <NoteRow
        :note="record"
        :active="isActive"
        :add-class="addClass"
        @click="emit('noteClick')"
    >
        <template #content>
            <div v-if="record.is_encrypted" class="text-xs py-2">
                (Protected contents)
            </div>
            <div v-if="foundLines.length > 0" class="pt-2 pb-2">
                <div
                    v-for="(line, index) in foundLines"
                    :key="index"
                    class="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                >
                    <span
                        v-for="(part, idx) in line"
                        :key="idx"
                        :class="
                            part.type === 'highlight'
                                ? 'bg-warning/30 text-fg rounded-sm'
                                : ''
                        "
                        >{{ part.value }}</span
                    >
                </div>
            </div>
        </template>
        <template v-if="record.group_name">
            <Icon name="folder" size="sm" /> {{ record.group_name }}{{ " " }}
        </template>
        <Icon name="user" size="sm" /> {{ record.user_name }}{{ "  " }}
        <Icon name="time-five" size="sm" />{{ " " }}
        <TimeAgo :time="record.updated_at" />
    </NoteRow>
</template>
