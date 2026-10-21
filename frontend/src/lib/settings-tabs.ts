import {
    CanManageAiProviders,
    CanManageBackups,
    CanManageFiles,
    CanManagePeriodicTasks,
    CanManageTags,
    CanManageUsers,
    CanViewAuditLog,
    CanViewServerLog,
    type AppPermission,
} from "./rbac";

export interface SettingsTab {
    name: string;
    route: string;
    icon: string;
    permission: AppPermission;
}

// Each route also requires its permission.
export const settingsTabs: SettingsTab[] = [
    {
        name: "Backups",
        route: "settings",
        icon: "data",
        permission: CanManageBackups.Update,
    },
    {
        name: "Tasks",
        route: "settings-periodic-tasks",
        icon: "time-five",
        permission: CanManagePeriodicTasks.View,
    },
    {
        name: "Users",
        route: "settings-users",
        icon: "group",
        permission: CanManageUsers.Update,
    },
    {
        name: "Tags",
        route: "settings-tags",
        icon: "purchase-tag",
        permission: CanManageTags.Read,
    },
    {
        name: "Files",
        route: "settings-files",
        icon: "file",
        permission: CanManageFiles.AllFiles,
    },
    {
        name: "Audit log",
        route: "settings-audit-log",
        icon: "shield",
        permission: CanViewAuditLog.View,
    },
    {
        name: "AI",
        route: "settings-ai",
        icon: "bot",
        permission: CanManageAiProviders.Update,
    },
    {
        name: "Server log",
        route: "settings-server-log",
        icon: "terminal",
        permission: CanViewServerLog.View,
    },
];

export const permissionForSettingsRoute = (route: string) =>
    settingsTabs.find((tab) => tab.route === route)?.permission;
