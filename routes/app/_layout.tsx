import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import ScriptsLoader from "../../islands/ScriptLoader.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import Sidebar from "$components/Sidebar.tsx";
import { canAccessSettings } from "$backend/rbac/role-definitions.ts";

export default async function Layout(
    _req: Request,
    ctx: FreshContext<AppState>,
) {
    const { name = "", id, timezone = "", role = "user" } =
        ctx.state.session?.data.user ?? {};

    const permissions = ctx.state.permissions ?? [];

    const socketHost = Deno.env.get("SOCKET_HOSTNAME") ?? "ws://localhost:8080";
    const initialNotifications = await getUserNotifications(id!);

    return (
        <div className="flex h-screen">
            <Sidebar
                initialNotifications={initialNotifications}
                showSettings={canAccessSettings(role)}
            />
            <div className="w-4/5 bg-gray-900 overflow-auto">
                <ScriptsLoader
                    socketHost={socketHost}
                    userData={{
                        name,
                        id: id!,
                        timezone,
                        csrfToken: ctx.state.newCsrfToken ?? "",
                        permissions,
                    }}
                />
                <ctx.Component />
            </div>
        </div>
    );
}
