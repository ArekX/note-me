import { FreshContext, LayoutConfig } from "$fresh/server.ts";
import { AppState } from "$types";
import Scripts from "$islands/Scripts.tsx";
import { getUserNotifications } from "$backend/repository/notification-repository.ts";
import { Sidebar } from "$components/Sidebar.tsx";

export const config: LayoutConfig = {
  skipInheritedLayouts: true,
};

export default async function Layout(
  req: Request,
  ctx: FreshContext<AppState>,
) {
  const { name, id } = ctx.state.session?.data.user ?? {};

  const socketHost = Deno.env.get("SOCKET_HOSTNAME") ?? "ws://localhost:8080";
  const initialNotifications = await getUserNotifications(id!);

  return (
    <div className="flex h-screen">
      <Sidebar
        initialNotifications={initialNotifications}
        userDisplayName={name || ""}
        route={ctx.route}
      />
      <ctx.Component />
      <Scripts socketHost={socketHost} />
    </div>
  );
}
