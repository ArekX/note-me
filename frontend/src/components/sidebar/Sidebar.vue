<script setup lang="ts">
import { onMounted, watch } from "vue";
import AiPanel from "@/components/ai/AiPanel.vue";
import NotificationListView from "@/components/notifications/NotificationListView.vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import TreeList from "@/components/tree/TreeList.vue";
import RecycleBinList from "./recycle-bin/RecycleBinList.vue";
import RemindersList from "./reminders/RemindersList.vue";
import SharedNotesList from "./shared/SharedNotesList.vue";
import SearchBar from "./SearchBar.vue";
import SearchView from "./SearchView.vue";
import SwitcherContainer from "./SwitcherContainer.vue";
import { useSidebar, type SidebarSection } from "@/composables/useSidebar";
import { sidebarSections } from "@/lib/navigation";
import { useAiStore } from "@/stores/ai";
import { useSearchStore } from "@/stores/search";
import type { SearchType } from "@/types/records";

const sidebar = useSidebar();
const search = useSearchStore();
const ai = useAiStore();

const searchTypes: Record<SidebarSection, SearchType> = {
    notes: "general",
    search: "general",
    reminders: "reminders",
    shared: "shared",
    recycleBin: "recycleBin",
    ai: "general",
    notifications: "general",
};

watch(sidebar.section, (section) => {
    if (search.type !== searchTypes[section]) {
        search.setType(searchTypes[section]);
    }
});

onMounted(() => search.init());
</script>

<template>
    <aside class="flex flex-col min-h-0 h-full text-fg">
        <NotificationListView
            v-if="sidebar.section.value === 'notifications'"
        />
        <AiPanel
            v-else-if="sidebar.section.value === 'ai' && ai.access.enabled"
        />
        <SearchView v-else-if="search.isActive">
            <template #search><SearchBar /></template>
        </SearchView>
        <template v-else-if="sidebar.section.value === 'search'">
            <SwitcherContainer :icons="[]">Search</SwitcherContainer>
            <SearchBar query-place-holder="Search notes..." />
            <NoItemMessage icon="search">
                Search notes by title or text.
            </NoItemMessage>
        </template>
        <RemindersList v-else-if="sidebar.section.value === 'reminders'">
            <template #switcher>{{ sidebarSections.reminders.label }}</template>
            <template #search><SearchBar /></template>
        </RemindersList>
        <SharedNotesList v-else-if="sidebar.section.value === 'shared'">
            <template #switcher>{{ sidebarSections.shared.label }}</template>
            <template #search><SearchBar /></template>
        </SharedNotesList>
        <RecycleBinList v-else-if="sidebar.section.value === 'recycleBin'">
            <template #switcher>{{
                sidebarSections.recycleBin.label
            }}</template>
            <template #search><SearchBar /></template>
        </RecycleBinList>
        <TreeList v-else>
            <template #switcher>{{ sidebarSections.notes.label }}</template>
            <template #search><SearchBar /></template>
        </TreeList>
    </aside>
</template>
