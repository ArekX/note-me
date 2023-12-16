import { PageProps } from "$fresh/server.ts";
import { Logo } from "$components/Logo.tsx";
import { MenuItem, Nav } from "$components/Nav.tsx";
import { AppState } from "$types/app-state.ts";

export default function Layout(
  { Component, route, state }: PageProps<unknown, AppState>,
) {
  const { username = "", name = "" } = state.session?.data.user ?? {};

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
          <a href="/app">
            <Logo white={true} height={25} width={25} /> NoteMe
          </a>
          <div class="mt-5">Welcome, {name}</div>
        </div>
        <Nav items={navItems} activeRoute={route} />
      </div>
      <div className="w-4/5 bg-gray-900 overflow-auto">
        <Component />
      </div>
    </div>
  );
}
