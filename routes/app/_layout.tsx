import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import IslandInitializer from "$islands/IslandInitializer.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import Sidebar from "$islands/sidebar/Sidebar.tsx";
import { canAccessSettings } from "$backend/rbac/role-definitions.ts";
import { Partial } from "$fresh/runtime.ts";
import EncryptionLockWindow from "$islands/encryption/EncryptionLockWindow.tsx";
import { getSocketHostname } from "$backend/env.ts";

export default async function Layout(
    req: Request,
    ctx: FreshContext<AppState>,
) {
    const { name = "", id, timezone = "", role = "user", onboarding_state } =
        ctx.state.session?.data.user ?? {};

    const permissions = ctx.state.permissions ?? [];

    const socketHost = getSocketHostname(req);

    const initialNotifications = await getUserNotifications(id!);

    const isSidebarAllowed = ctx.route !== "/app/reset-password";

    return (
        <div
            id="clientNav"
            className="flex max-md:flex-col h-screen"
            f-client-nav
        >
            {isSidebarAllowed && (
                <Sidebar
                    initialNotifications={initialNotifications}
                    showSettings={canAccessSettings(role)}
                />
            )}
            <div
                class={`content-sidebar w-4/5 max-md:w-full max-md:flex-grow bg-gray-900 overflow-auto ${
                    isSidebarAllowed ? "main-with-sidebar" : ""
                }`}
            >
                <EncryptionLockWindow />
                <IslandInitializer
                    socketHost={socketHost}
                    userData={{
                        name,
                        id: id!,
                        timezone,
                        csrfToken: ctx.state.newCsrfToken ?? "",
                        permissions,
                        onboardingState: onboarding_state ?? {},
                    }}
                />
                <Partial name="body">
                    <ctx.Component />
                </Partial>
            </div>
        </div>
    );
}
