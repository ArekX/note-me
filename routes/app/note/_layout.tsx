import {
  FreshContext,
  Handlers,
  LayoutConfig,
  PageProps,
} from "$fresh/server.ts";
import { Logo } from "$components/Logo.tsx";
import { MenuItem, Nav } from "$components/Nav.tsx";
import { AppState } from "$types/app-state.ts";
import Notifications from "$islands/Notifications.tsx";
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
  const { username, name, id } = ctx.state.session?.data.user ?? {};

  const socketHost = Deno.env.get("SOCKET_HOSTNAME") ?? "ws://localhost:8080";
  const initialNotifications = await getUserNotifications(id!);

  const navItems: MenuItem[] = [
    {
      icon: "note",
      name: "Notes",
      link: "/app",
    },
    {
      icon: "person",
      name: "Profile",
      link: "/app/profile",
    },
    {
      icon: "group",
      name: "Users",
      link: "/app/users",
    },
    {
      icon: "logout",
      name: `Logout (${username})`,
      link: "/app/logout",
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        initialNotifications={initialNotifications}
        userDisplayName={name || ""}
        route={ctx.route}
        navItems={navItems}
      />
      <ctx.Component />
      <Scripts socketHost={socketHost} />
    </div>
  );
}
