import { readonly, ref } from "vue";

export type SidebarSection =
    | "notes"
    | "search"
    | "reminders"
    | "shared"
    | "recycleBin"
    | "ai"
    | "notifications";

const section = ref<SidebarSection>("notes");
const isPanelOpen = ref(true);
const searchFocusRequest = ref(0);

export const useSidebar = () => ({
    section: readonly(section),
    isPanelOpen: readonly(isPanelOpen),
    searchFocusRequest: readonly(searchFocusRequest),
    // Picking the open section again hides the panel.
    pick: (next: SidebarSection) => {
        if (section.value === next && isPanelOpen.value) {
            isPanelOpen.value = false;
            return;
        }
        section.value = next;
        isPanelOpen.value = true;
        if (next === "search") {
            searchFocusRequest.value++;
        }
    },
    show: (next: SidebarSection) => {
        section.value = next;
        isPanelOpen.value = true;
        if (next === "search") {
            searchFocusRequest.value++;
        }
    },
    hide: () => {
        isPanelOpen.value = false;
    },
});
