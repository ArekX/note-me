<script setup lang="ts">
import Viewer from "@/components/markdown/Viewer.vue";
import { useOpenNote } from "@/composables/useOpenNote";
import { useSidebar } from "@/composables/useSidebar";
import { createdNotes, type ChatPart } from "@/lib/ai/conversation-view";
import AiNoteCard from "./AiNoteCard.vue";
import AiToolSteps from "./AiToolSteps.vue";
import { useSearchStore } from "@/stores/search";

defineProps<{ parts: ChatPart[] }>();
const emit = defineEmits<{ allow: [id: string]; deny: [id: string] }>();

const openNote = useOpenNote();
const sidebar = useSidebar();
const search = useSearchStore();

const TAG_LINK = "#tag:";

// The results show in the notes section; the AI panel would cover them.
const searchTag = (tag: string) => {
    sidebar.show("notes");
    search.setTags([tag]);
};

// Markdown links open a new tab; the assistant's links to app pages (shared
// notes) open in place, unless a modifier asks for a new tab, and its tag
// links search like a note's tags.
const handleLinkClick = (event: MouseEvent) => {
    const link = (event.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (href?.startsWith(TAG_LINK)) {
        event.preventDefault();
        try {
            searchTag(decodeURIComponent(href.slice(TAG_LINK.length)));
        } catch {
            searchTag(href.slice(TAG_LINK.length));
        }
        return;
    }
    if (
        !href?.startsWith("/app/") ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
    ) {
        return;
    }
    event.preventDefault();
    void openNote(href);
};
</script>

<template>
    <div class="ai-answer-parts" @click="handleLinkClick">
        <template v-for="(part, index) in parts" :key="index">
            <Viewer v-if="part.kind === 'text'" :text="part.text" />
            <template v-else>
                <AiToolSteps
                    :steps="part.steps"
                    @allow="emit('allow', $event)"
                    @deny="emit('deny', $event)"
                />
                <AiNoteCard
                    v-for="note in createdNotes(part.steps)"
                    :key="note.id"
                    :note="note"
                />
            </template>
        </template>
    </div>
</template>

<style scoped>
.ai-answer-parts :deep(a[href^="#tag:"]) {
    padding: 0.0625rem 0.4375rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    background: var(--color-surface-2);
    text-decoration: none;
}

.ai-answer-parts :deep(a[href^="#tag:"]:hover) {
    color: var(--color-fg);
    background: var(--color-line-strong);
}
</style>
