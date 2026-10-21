import type { PanelItem } from "@/components/SideTabPanel.vue";
import { permissionForSettingsRoute } from "@/lib/settings-tabs";
import type { HelpPage } from "@/stores/help";
import type { useUserStore } from "@/stores/user";
import AdminAiPage from "./pages/AdminAiPage.vue";
import AdminAuditLogPage from "./pages/AdminAuditLogPage.vue";
import AdminBackupsPage from "./pages/AdminBackupsPage.vue";
import AdminFilesPage from "./pages/AdminFilesPage.vue";
import AdminPeriodicTasksPage from "./pages/AdminPeriodicTasksPage.vue";
import AdminServerLogPage from "./pages/AdminServerLogPage.vue";
import AdminTagsPage from "./pages/AdminTagsPage.vue";
import AdminUsersPage from "./pages/AdminUsersPage.vue";
import AiAssistantPage from "./pages/AiAssistantPage.vue";
import DeletingNotesPage from "./pages/DeletingNotesPage.vue";
import EditingNotesPage from "./pages/EditingNotesPage.vue";
import GeneralPage from "./pages/GeneralPage.vue";
import KeyboardShortcutsPage from "./pages/KeyboardShortcutsPage.vue";
import MarkdownSyntaxPage from "./pages/MarkdownSyntaxPage.vue";
import McpClientsPage from "./pages/McpClientsPage.vue";
import NoteFilesPage from "./pages/NoteFilesPage.vue";
import NoteHistoryPage from "./pages/NoteHistoryPage.vue";
import OrganizingNotesPage from "./pages/OrganizingNotesPage.vue";
import ProtectingNotesPage from "./pages/ProtectingNotesPage.vue";
import SearchingNotesPage from "./pages/SearchingNotesPage.vue";
import SettingRemindersPage from "./pages/SettingRemindersPage.vue";
import SharingNotesPage from "./pages/SharingNotesPage.vue";
import SupportedLanguagesPage from "./pages/SupportedLanguagesPage.vue";

export interface HelpTopic extends PanelItem {
    key: HelpPage;
    settingsRoute?: string;
}

export const helpTopics: HelpTopic[] = [
    { key: "general", name: "General", component: GeneralPage },
    {
        key: "organizing-notes",
        name: "Organizing notes",
        component: OrganizingNotesPage,
    },
    {
        key: "sharing-notes",
        name: "Sharing notes",
        component: SharingNotesPage,
    },
    {
        key: "setting-reminders",
        name: "Setting reminders",
        component: SettingRemindersPage,
    },
    {
        key: "protecting-notes",
        name: "Protecting notes",
        component: ProtectingNotesPage,
    },
    { key: "note-history", name: "Note history", component: NoteHistoryPage },
    {
        key: "searching-notes",
        name: "Searching notes",
        component: SearchingNotesPage,
    },
    {
        key: "editing-notes",
        name: "Editing notes",
        component: EditingNotesPage,
    },
    {
        key: "deleting-notes",
        name: "Deleting notes",
        component: DeletingNotesPage,
    },
    { key: "note-files", name: "Files", component: NoteFilesPage },
    {
        key: "ai-assistant",
        name: "AI assistant",
        component: AiAssistantPage,
    },
    { key: "mcp-clients", name: "MCP clients", component: McpClientsPage },
    {
        key: "keyboard-shortcuts",
        name: "Keyboard Shortcuts",
        component: KeyboardShortcutsPage,
    },
    {
        key: "markdown-syntax",
        name: "Markdown Syntax",
        component: MarkdownSyntaxPage,
    },
    {
        key: "supported-language-highlights",
        name: "Supported languages in code blocks",
        component: SupportedLanguagesPage,
    },
    {
        key: "admin-backups",
        name: "Admin: Backups",
        settingsRoute: "settings",
        component: AdminBackupsPage,
    },
    {
        key: "admin-periodic-tasks",
        name: "Admin: Periodic tasks",
        settingsRoute: "settings-periodic-tasks",
        component: AdminPeriodicTasksPage,
    },
    {
        key: "admin-users",
        name: "Admin: Users",
        settingsRoute: "settings-users",
        component: AdminUsersPage,
    },
    {
        key: "admin-tags",
        name: "Admin: Tags",
        settingsRoute: "settings-tags",
        component: AdminTagsPage,
    },
    {
        key: "admin-files",
        name: "Admin: Files",
        settingsRoute: "settings-files",
        component: AdminFilesPage,
    },
    {
        key: "admin-audit-log",
        name: "Admin: Audit log",
        settingsRoute: "settings-audit-log",
        component: AdminAuditLogPage,
    },
    {
        key: "admin-ai",
        name: "Admin: AI",
        settingsRoute: "settings-ai",
        component: AdminAiPage,
    },
    {
        key: "admin-server-log",
        name: "Admin: Server log",
        settingsRoute: "settings-server-log",
        component: AdminServerLogPage,
    },
];

// The Tags tab only needs canReadTags, which every user has, so the settings
// area check keeps its topic from regular users.
export const canSeeHelpTopic = (
    { settingsRoute }: HelpTopic,
    userStore: ReturnType<typeof useUserStore>,
) => {
    if (!settingsRoute) {
        return true;
    }
    const permission = permissionForSettingsRoute(settingsRoute);
    return (
        userStore.canAccessSettings &&
        permission !== undefined &&
        userStore.can(permission)
    );
};
