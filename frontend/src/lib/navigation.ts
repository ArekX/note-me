import type { SidebarSection } from "@/composables/useSidebar";

export const sidebarSections: Record<
    SidebarSection,
    { icon: string; label: string }
> = {
    notes: { icon: "note", label: "Notes" },
    search: { icon: "search", label: "Search" },
    reminders: { icon: "alarm", label: "Reminders" },
    shared: { icon: "share-alt", label: "Shared with me" },
    recycleBin: { icon: "recycle", label: "Recycle bin" },
    ai: { icon: "bot", label: "AI" },
    notifications: { icon: "bell", label: "Notifications" },
};

export const pickSections = (keys: SidebarSection[]) =>
    keys.map((key) => ({ key, ...sidebarSections[key] }));

export const profileTabs = [
    { name: "Profile", menuLabel: "Profile", route: "profile", icon: "user" },
    {
        name: "Passkeys",
        menuLabel: "My passkeys",
        route: "profile-passkeys",
        icon: "key",
    },
    {
        name: "MCP clients",
        menuLabel: "MCP clients",
        route: "profile-mcp-clients",
        icon: "plug",
    },
    {
        name: "Files",
        menuLabel: "My files",
        route: "profile-files",
        icon: "file",
    },
    {
        name: "Data",
        menuLabel: "Import / Export",
        route: "profile-data",
        icon: "data",
    },
];
