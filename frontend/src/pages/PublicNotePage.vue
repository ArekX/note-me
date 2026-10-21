<script setup lang="ts">
import { getCurrentMonthWallpaper } from "@/lib/wallpaper";
import { computed, onMounted, ref } from "vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import ViewNote from "@/components/notes/ViewNote.vue";
import { useLoader } from "@/composables/useLoader";
import { api } from "@/lib/api";
import type { PublicSharedNote, ViewNoteRecord } from "@/types/records";

// Anonymous, so it never opens the socket.
const props = defineProps<{ identifier: string }>();

const loader = useLoader(true);
const note = ref<PublicSharedNote | null>(null);
const error = ref("");

const record = computed<ViewNoteRecord | null>(() =>
    note.value ? { ...note.value, group_id: null, group_name: null } : null,
);

onMounted(
    loader.wrap(async () => {
        try {
            note.value = await api.getPublicNote(props.identifier);
            document.title = `NoteMe - ${note.value.title}`;
        } catch (loadError) {
            error.value =
                loadError instanceof Error
                    ? loadError.message
                    : "Note not found.";
        }
    }),
);

const wallpaper = `url(${getCurrentMonthWallpaper()})`;
</script>

<template>
    <div
        class="app-backdrop min-h-screen px-5 py-8 max-md:px-0 max-md:py-0"
        :style="{ '--wallpaper': wallpaper }"
    >
        <div
            class="text-fg lg:max-xl:w-3/4 xl:w-1/2 mx-auto px-8 py-8 max-md:px-4 rounded-xl max-md:rounded-none border border-line bg-surface glass"
        >
            <Skeleton v-if="loader.running.value" variant="note" />
            <NoItemMessage v-else-if="error" icon="error">{{
                error
            }}</NoItemMessage>
            <ViewNote
                v-else-if="record"
                :record="record"
                readonly
                share-mode="everyone"
                disable-tag-links
                :author="note!.user_name"
            />
        </div>
    </div>
</template>
