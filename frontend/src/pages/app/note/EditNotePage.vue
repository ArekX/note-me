<script setup lang="ts">
import NoteEditor from "@/components/notes/NoteEditor.vue";
import NotePage from "@/components/notes/NotePage.vue";
import EditNoteIntroduction from "@/components/onboarding/EditNoteIntroduction.vue";

defineProps<{ id: string }>();
</script>

<template>
    <NotePage :id="Number(id)" v-slot="{ record, version, reload }">
        <NoteEditor
            :key="`${record.id}-${version}`"
            :note="record"
            @reload="reload"
        />
    </NotePage>
    <EditNoteIntroduction />
</template>
