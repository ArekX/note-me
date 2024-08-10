import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import IslandInitializer from "$islands/IslandInitializer.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import Sidebar from "$components/Sidebar.tsx";
import { canAccessSettings } from "$backend/rbac/role-definitions.ts";
import { Partial } from "$fresh/runtime.ts";

export default async function Layout(
    _req: Request,
    ctx: FreshContext<AppState>,
) {
    const { name = "", id, timezone = "", role = "user", onboarding_state } =
        ctx.state.session?.data.user ?? {};

    const permissions = ctx.state.permissions ?? [];

    const socketHost = Deno.env.get("SOCKET_HOSTNAME") ?? "ws://localhost:8080";
    const initialNotifications = await getUserNotifications(id!);

    const isSidebarAllowed = ctx.route !== "/app/reset-password";

    return (
        <div id="clientNav" className="flex h-screen" f-client-nav>
            {isSidebarAllowed && (
                <Sidebar
                    initialNotifications={initialNotifications}
                    showSettings={canAccessSettings(role)}
                />
            )}
            <div
                class={`w-4/5 bg-gray-900 overflow-auto ${
                    isSidebarAllowed ? "main-with-sidebar" : ""
                }`}
            >
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
