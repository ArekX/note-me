<script setup lang="ts">
import ExportMyData from "@/components/data/ExportMyData.vue";
import ImportNotes from "@/components/data/ImportNotes.vue";
</script>

<template>
    <div
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] max-w-4xl"
    >
        <ExportMyData />
        <ImportNotes />
    </div>
</template>
