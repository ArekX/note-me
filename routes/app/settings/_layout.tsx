import { PageProps } from "$fresh/server.ts";
import { TabLink, TabPanel } from "$components/TabPanel.tsx";
import { AppState } from "$types";
import { CanManageSettings } from "$backend/rbac/permissions.ts";
import { hasPermission } from "$backend/rbac/authorizer.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";

export default function Layout(
    { Component, route, state }: PageProps<never, AppState>,
) {
    const settings = [
        hasPermission(CanManageSettings.Update, state) && {
            name: "General",
            link: "/app/settings",
        },
        hasPermission(CanManageUsers.List, state) && {
            name: "Users",
            link: "/app/settings/users",
        },
        hasPermission(CanManageTags.List, state) && {
            name: "Tags",
            link: "/app/settings/tags",
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
