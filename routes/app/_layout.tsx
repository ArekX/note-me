import { FreshContext } from "$fresh/server.ts";
import { MenuItem } from "$components/Nav.tsx";
import { AppState } from "$types";
import Scripts from "$islands/Scripts.tsx";
import { getUserNotifications } from "../../repository/notification-repository.ts";
import { Sidebar } from "$components/Sidebar.tsx";

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
      <div className="w-4/5 bg-gray-900 overflow-auto">
        {/* needs fixing to allow load more */}
        <ctx.Component />
      </div>
      <Scripts socketHost={socketHost} />
    </div>
  );
}
