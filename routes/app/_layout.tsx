import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import ScriptsLoader from "../../islands/ScriptLoader.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import { Sidebar } from "$components/Sidebar.tsx";

export default async function Layout(
  // { Component, route, state }: PageProps<unknown, AppState>,
  req: Request,
  ctx: FreshContext<AppState>,
) {
  const { name = "", id, timezone = "", default_group_id = 0 } =
    ctx.state.session?.data.user ?? {};

  const socketHost = Deno.env.get("SOCKET_HOSTNAME") ?? "ws://localhost:8080";
  const initialNotifications = await getUserNotifications(id!);

  return (
    <div className="flex h-screen">
      <Sidebar
        initialNotifications={initialNotifications}
        userDisplayName={name || ""}
        route={ctx.route}
      />
      <div className="w-4/5 bg-gray-900 overflow-auto">
        <ScriptsLoader
          socketHost={socketHost}
          userData={{
            name,
            default_group_id,
            timezone,
            csrfToken: ctx.state.newCsrfToken ?? "",
          }}
        />
        <ctx.Component />
      </div>
    </div>
  );
}
