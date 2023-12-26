import { FreshContext, LayoutConfig } from "$fresh/server.ts";
import { MenuItem } from "$components/Nav.tsx";
import { AppState } from "$types";
import Scripts from "$islands/Scripts.tsx";
import { getUserNotifications } from "$repository";
import { Sidebar } from "$components/Sidebar.tsx";

export const config: LayoutConfig = {
  skipInheritedLayouts: true, // Skip already inherited layouts
};

export default async function Layout(
  // { Component, route, state }: PageProps<unknown, AppState>,
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
