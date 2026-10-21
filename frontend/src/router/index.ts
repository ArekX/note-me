import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import ErrorStatusPage from "@/pages/ErrorStatusPage.vue";
import { authGuard } from "./guards";

// routes/ of the original app. Server-only routes (/file/:identifier,
// downloads) are handled by the Go server.
export const routes: RouteRecordRaw[] = [
    {
        path: "/",
        name: "login",
        component: () => import("@/pages/LoginPage.vue"),
        meta: { wallpaper: true, guestOnly: true },
    },
    {
        path: "/public/:identifier",
        name: "public-note",
        component: () => import("@/pages/PublicNotePage.vue"),
        props: true,
        meta: { allowScrolling: true },
    },
    {
        path: "/app",
        component: () => import("@/layouts/AppLayout.vue"),
        meta: { requiresAuth: true },
        children: [
            {
                path: "",
                name: "dashboard",
                component: () => import("@/pages/app/DashboardPage.vue"),
                meta: { title: "Dashboard" },
            },
            {
                path: "logout",
                name: "logout",
                component: () => import("@/pages/LogoutPage.vue"),
            },
            {
                path: "reset-password",
                name: "reset-password",
                component: () => import("@/pages/ResetPasswordPage.vue"),
                meta: { title: "Reset password" },
            },
            {
                path: "note",
                component: () => import("@/layouts/NoteLayout.vue"),
                children: [
                    {
                        path: "",
                        name: "note-index",
                        redirect: { name: "dashboard" },
                    },
                    {
                        path: "new",
                        name: "note-new",
                        component: () =>
                            import("@/pages/app/note/NewNotePage.vue"),
                        meta: { title: "New note" },
                    },
                    {
                        path: "view-:id(\\d+)",
                        name: "note-view",
                        component: () =>
                            import("@/pages/app/note/ViewNotePage.vue"),
                        props: true,
                    },
                    {
                        path: "edit-:id(\\d+)",
                        name: "note-edit",
                        component: () =>
                            import("@/pages/app/note/EditNotePage.vue"),
                        props: true,
                    },
                    {
                        path: "shared-:id(\\d+)",
                        name: "note-shared",
                        component: () =>
                            import("@/pages/app/note/SharedNotePage.vue"),
                        props: true,
                    },
                ],
            },
            {
                path: "profile",
                component: () => import("@/layouts/ProfileLayout.vue"),
                children: [
                    {
                        path: "",
                        name: "profile",
                        component: () =>
                            import("@/pages/app/profile/ProfilePage.vue"),
                        meta: { title: "Profile" },
                    },
                    {
                        path: "passkeys",
                        name: "profile-passkeys",
                        component: () =>
                            import("@/pages/app/profile/PasskeysPage.vue"),
                        meta: { title: "My Passkeys" },
                    },
                    {
                        path: "mcp-clients",
                        name: "profile-mcp-clients",
                        component: () =>
                            import("@/pages/app/profile/McpClientsPage.vue"),
                        meta: { title: "MCP clients" },
                    },
                    {
                        path: "data",
                        name: "profile-data",
                        component: () =>
                            import("@/pages/app/profile/DataPage.vue"),
                        meta: { title: "Import / Export" },
                    },
                    {
                        path: "files",
                        name: "profile-files",
                        component: () =>
                            import("@/pages/app/profile/FilesPage.vue"),
                        meta: { title: "My files" },
                    },
                ],
            },
            {
                path: "settings",
                component: () => import("@/layouts/SettingsLayout.vue"),
                meta: { requiresSettingsAccess: true },
                children: [
                    {
                        path: "",
                        name: "settings",
                        component: () =>
                            import("@/pages/app/settings/SettingsPage.vue"),
                        meta: { title: "Settings" },
                    },
                    {
                        path: "users",
                        name: "settings-users",
                        component: () =>
                            import("@/pages/app/settings/UsersPage.vue"),
                        meta: { title: "Users" },
                    },
                    {
                        path: "tags",
                        name: "settings-tags",
                        component: () =>
                            import("@/pages/app/settings/TagsPage.vue"),
                        meta: { title: "Tags" },
                    },
                    {
                        path: "files",
                        name: "settings-files",
                        component: () =>
                            import("@/pages/app/settings/FilesPage.vue"),
                        meta: { title: "Files" },
                    },
                    {
                        path: "periodic-tasks",
                        name: "settings-periodic-tasks",
                        component: () =>
                            import("@/pages/app/settings/PeriodicTasksPage.vue"),
                        meta: { title: "Periodic tasks" },
                    },
                    {
                        path: "audit-log",
                        name: "settings-audit-log",
                        component: () =>
                            import("@/pages/app/settings/AuditLogPage.vue"),
                        meta: { title: "Audit log" },
                    },
                    {
                        path: "ai",
                        name: "settings-ai",
                        component: () =>
                            import("@/pages/app/settings/AiProvidersPage.vue"),
                        meta: { title: "AI" },
                    },
                    {
                        path: "server-log",
                        name: "settings-server-log",
                        component: () =>
                            import("@/pages/app/settings/ServerLogPage.vue"),
                        meta: { title: "Server log" },
                    },
                ],
            },
        ],
    },
    {
        path: "/oauth/authorize",
        name: "oauth-authorize",
        component: () => import("@/pages/OAuthAuthorizePage.vue"),
        meta: {
            title: "Allow access",
            requiresAuth: true,
            returnAfterSteps: true,
            wallpaper: true,
        },
    },
    {
        path: "/error/:status(403|404|500)",
        name: "error",
        component: ErrorStatusPage,
        props: true,
        meta: { title: "Error" },
    },
    {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("@/pages/NotFoundPage.vue"),
        meta: { title: "Not found" },
    },
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(authGuard);

// A page whose code cannot be loaded (for example after an update while the
// tab was open) shows the 500 page instead of leaving the old page up.
router.onError((_error, to) => {
    if (to.name !== "error") {
        void router.replace({ name: "error", params: { status: "500" } });
    }
});

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        requiresAuth?: boolean;
        requiresSettingsAccess?: boolean;
        guestOnly?: boolean;
        // A required step such as a password reset comes back here after.
        returnAfterSteps?: boolean;
        wallpaper?: boolean;
        allowScrolling?: boolean;
    }
}
