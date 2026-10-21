<script setup lang="ts">
import { computed } from "vue";
import { RouterView } from "vue-router";
import TabPanel from "@/components/TabPanel.vue";
import { settingsTabs } from "@/lib/settings-tabs";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

const links = computed(() =>
    settingsTabs
        .filter((tab) => userStore.can(tab.permission))
        .map(({ name, route, icon }) => ({ name, route, icon })),
);
</script>

<template>
    <TabPanel :links="links">
        <RouterView />
    </TabPanel>
</template>
