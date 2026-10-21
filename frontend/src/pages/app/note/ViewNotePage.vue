<script setup lang="ts">
import NotePage from "@/components/notes/NotePage.vue";
import ViewNote from "@/components/notes/ViewNote.vue";
import ViewNoteIntroduction from "@/components/onboarding/ViewNoteIntroduction.vue";

defineProps<{ id: string }>();
</script>

<template>
    <NotePage :id="Number(id)" mark-opened v-slot="{ record, version, reload }">
        <ViewNote
            :key="`${record.id}-${version}`"
            :record="record"
            @reload="reload"
        />
    </NotePage>
    <ViewNoteIntroduction />
</template>
