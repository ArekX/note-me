import { PageProps } from "$fresh/server.ts";
import TabPanel, { TabLink } from "$components/TabPanel.tsx";
import { AppState } from "$types";
import {
    CanManageBackups,
    CanManageFiles,
    CanManagePeriodicTasks,
} from "$backend/rbac/permissions.ts";
import { hasPermission } from "$backend/rbac/authorizer.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";

export default function Layout(
    { Component, route, state }: PageProps<never, AppState>,
) {
    const settings = [
        hasPermission(CanManageBackups.Update, state) && {
            name: "Backups",
            link: "/app/settings",
        },
        hasPermission(CanManagePeriodicTasks.View, state) && {
            name: "Tasks",
            link: "/app/settings/periodic-tasks",
        },
        hasPermission(CanManageUsers.Update, state) && {
            name: "Users",
            link: "/app/settings/users",
        },
        hasPermission(CanManageTags.Read, state) && {
            name: "Tags",
            link: "/app/settings/tags",
        },
        hasPermission(CanManageFiles.AllFiles, state) && {
            name: "Files",
            link: "/app/settings/files",
        },
    ].filter(Boolean) as TabLink[];

    return (
        <TabPanel
            links={settings}
            activeLink={route}
        >
            <Component />
        </TabPanel>
    );
}
