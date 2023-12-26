import { FreshContext, LayoutConfig } from "$fresh/server.ts";
import { AppState } from "$types";
import ScriptLoader from "../../../islands/ScriptLoader.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import { Sidebar } from "$components/Sidebar.tsx";

export const config: LayoutConfig = {
  skipInheritedLayouts: true,
};

export default async function Layout(
  _req: Request,
  ctx: FreshContext<AppState>,
) {
  const { name = "", id, default_group_id = 0, timezone = "" } =
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
      <ScriptLoader
        socketHost={socketHost}
        userData={{
          name,
          default_group_id,
          timezone,
        }}
      />
      <ctx.Component />
    </div>
  );
}
