<script setup lang="ts">
import { RouterView } from "vue-router";
import TabPanel from "@/components/TabPanel.vue";
import { profileTabs } from "@/lib/navigation";
</script>

<template>
    <TabPanel :links="profileTabs">
        <RouterView />
    </TabPanel>
</template>
