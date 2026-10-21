import { ref } from "vue";
import { defineStore } from "pinia";

export type HelpPage =
    | "general"
    | "editing-notes"
    | "markdown-syntax"
    | "organizing-notes"
    | "searching-notes"
    | "sharing-notes"
    | "setting-reminders"
    | "note-history"
    | "note-files"
    | "ai-assistant"
    | "mcp-clients"
    | "protecting-notes"
    | "deleting-notes"
    | "keyboard-shortcuts"
    | "supported-language-highlights"
    | "admin-backups"
    | "admin-periodic-tasks"
    | "admin-users"
    | "admin-tags"
    | "admin-files"
    | "admin-audit-log"
    | "admin-ai"
    | "admin-server-log";

export const useHelpStore = defineStore("help", () => {
    const isOpen = ref(false);
    const page = ref<HelpPage>("general");

    const open = (target: HelpPage = "general") => {
        page.value = target;
        isOpen.value = true;
    };

    const close = () => {
        isOpen.value = false;
    };

    return { isOpen, page, open, close };
});
