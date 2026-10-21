<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import EditNoteIntroduction from "@/components/onboarding/EditNoteIntroduction.vue";
import NoteEditor, {
    type NoteEditorData,
} from "@/components/notes/NoteEditor.vue";
import { useLoader } from "@/composables/useLoader";
import { socketErrorMessage } from "@/lib/error-messages";
import { useGroupsStore } from "@/stores/groups";
import type { GetSingleGroupResponse } from "@/types/messages";

const route = useRoute();
const groupsStore = useGroupsStore();
const loader = useLoader(true);

const note = ref<NoteEditorData | null>(null);
const error = ref("");

const load = (groupId: number | null) =>
    loader.run(async () => {
        note.value = null;
        error.value = "";

        let group: GetSingleGroupResponse["record"] = null;
        if (groupId) {
            try {
                group = await groupsStore.getGroup(groupId);
            } catch (loadError) {
                error.value = socketErrorMessage(loadError);
                return;
            }
            if (!group) {
                error.value = "Requested group not found.";
                return;
            }
        }

        note.value = {
            id: null,
            title: "",
            note: "",
            is_encrypted: false,
            is_wide: false,
            tags: [],
            group_id: group?.id ?? null,
            group_name: group?.name ?? "",
        };
    });

watch(
    () => Number(route.query.group_id) || null,
    (groupId) => void load(groupId),
    { immediate: true },
);
</script>

<template>
    <Skeleton v-if="loader.running.value" variant="note" />
    <NoItemMessage v-else-if="error" icon="error">{{ error }}</NoItemMessage>
    <NoteEditor v-else-if="note" :key="route.fullPath" :note="note" />
    <EditNoteIntroduction />
</template>
