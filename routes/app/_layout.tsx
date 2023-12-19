import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { Logo } from "$components/Logo.tsx";
import { MenuItem, Nav } from "$components/Nav.tsx";
import { AppState } from "$types/app-state.ts";
import Notifications from "$islands/Notifications.tsx";
import Scripts from "$islands/Scripts.tsx";
import { getUserNotifications } from "../../repository/notification-repository.ts";

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
      <div className="w-1/5 bg-gray-800 text-white">
        <div class="text-center mt-5 mb-5">
          <Notifications initialNotifications={initialNotifications} />
          <a href="/app">
            <Logo white={true} height={25} width={25} /> NoteMe
          </a>
          <div class="mt-5">Welcome, {name}</div>
        </div>
        <Nav items={navItems} activeRoute={ctx.route} />
      </div>
      <div className="w-4/5 bg-gray-900 overflow-auto">
        <ctx.Component />
      </div>
      <Scripts socketHost={socketHost} />
    </div>
  );
}
