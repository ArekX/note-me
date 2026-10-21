<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { useOpenNote } from "@/composables/useOpenNote";
import type { CreatedNote } from "@/lib/ai/conversation-view";
import { redirectTo } from "@/lib/redirect";

defineProps<{ note: CreatedNote }>();

const openNote = useOpenNote();
</script>

<template>
    <button
        type="button"
        class="w-full my-1.5 flex items-center gap-2.5 rounded-md border border-line bg-surface-2 px-2.5 py-2 text-left hover:border-line-strong"
        :title="`Open ${note.title || 'Untitled'}`"
        @click="openNote(redirectTo.viewNote({ noteId: note.id }))"
    >
        <Icon name="note" size="xl" class-name="shrink-0 text-accent" />
        <span class="min-w-0 grow">
            <span class="block truncate font-medium">{{
                note.title || "Untitled"
            }}</span>
            <span class="block text-xs text-muted">Note created</span>
        </span>
        <Icon name="chevron-right" size="lg" class-name="shrink-0 text-muted" />
    </button>
</template>
