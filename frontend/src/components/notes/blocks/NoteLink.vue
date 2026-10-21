<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/components/Icon.vue";
import { useLoader } from "@/composables/useLoader";
import { useMobileMenu } from "@/composables/useMobileMenu";
import { useOpenNote } from "@/composables/useOpenNote";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useSidebar } from "@/composables/useSidebar";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { redirectTo } from "@/lib/redirect";
import { useNotesStore } from "@/stores/notes";
import type { NoteFrontendResponse } from "@/types/messages";

const props = defineProps<{ noteId: number }>();

const openNoteRoute = useOpenNote();
const notesStore = useNotesStore();
const sidebar = useSidebar();
const mobileMenu = useMobileMenu();
const query = useResponsiveQuery();
const loader = useLoader(true);
const title = ref("");
const state = ref<"open" | "deleted" | "missing">("open");

const loadNote = loader.wrap(async () => {
    try {
        const record = await notesStore.getDetails(props.noteId, {
            include_title: true,
            include_deleted: true,
        });
        title.value = record.title;
        state.value = record.is_deleted ? "deleted" : "open";
    } catch {
        title.value = `Note #${props.noteId} not found`;
        state.value = "missing";
    }
});

watch(() => props.noteId, loadNote, { immediate: true });

const isThisNote = (id: number | undefined) => id === props.noteId;

useWebsocketService<NoteFrontendResponse>({
    notes: {
        updateNoteResponse: ({ updated_id, updated_data }) => {
            if (isThisNote(updated_id) && updated_data.title) {
                title.value = updated_data.title;
            }
        },
        deleteNoteResponse: ({ deleted_id }) => {
            if (isThisNote(deleted_id)) {
                state.value = "deleted";
            }
        },
        restoreDeletedNoteResponse: ({ restored_note }) => {
            if (isThisNote(restored_note?.id)) {
                state.value = "open";
            }
        },
        fullyDeleteNoteResponse: ({ deleted_id }) => {
            if (isThisNote(deleted_id)) {
                void loadNote();
            }
        },
    },
});

const label = computed(() =>
    state.value === "open" ? `Open ${title.value}` : title.value,
);

// A deleted note can only be restored, so its link opens the recycle bin.
const openNote = () => {
    if (state.value === "open") {
        void openNoteRoute(redirectTo.viewNote({ noteId: props.noteId }));
    } else if (state.value === "deleted") {
        sidebar.show("recycleBin");
        if (query.isMobile()) {
            mobileMenu.open();
        }
    }
};
</script>

<template>
    <span
        v-if="loader.running.value"
        role="status"
        aria-busy="true"
        aria-label="Loading"
        class="skeleton inline-block h-3.5 w-32 align-middle"
    />
    <button
        v-else
        type="button"
        :class="[
            'note-link',
            state === 'missing' && 'note-link-missing',
            state === 'deleted' && 'note-link-deleted',
        ]"
        :title="state === 'deleted' ? `${title} is in the recycle bin` : label"
        :disabled="state === 'missing'"
        @click="openNote"
    >
        <Icon
            :name="
                state === 'missing'
                    ? 'error'
                    : state === 'deleted'
                      ? 'recycle'
                      : 'note'
            "
            size="md"
        />
        <span class="note-link-title">{{ title }}</span>
        <span v-if="state === 'deleted'" class="note-link-state">
            In recycle bin
        </span>
    </button>
</template>
