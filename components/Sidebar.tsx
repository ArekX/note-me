import Notifications from "$islands/Notifications.tsx";
import { Logo } from "$components/Logo.tsx";
import { MenuItem, Nav } from "$components/Nav.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";

export interface SidebarProps {
  route: string;
  userDisplayName: string;
  initialNotifications: NotificationRecord[];
}

export function Sidebar(
  { route, initialNotifications, userDisplayName }: SidebarProps,
) {
  const navItems: MenuItem[] = [
    {
      icon: "note",
      name: "Notes",
      link: "/app/note",
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
      name: `Logout`,
      link: "/app/logout",
    },
  ];

  return (
    <div className="w-1/5 bg-gray-800 text-white">
      <div class="text-center mt-5 mb-5">
        <Notifications initialNotifications={initialNotifications} />
        <a href="/app">
          <Logo white={true} height={25} width={25} /> NoteMe
        </a>
        <div class="mt-5">Welcome, {userDisplayName}</div>
      </div>
      <Nav items={navItems} activeRoute={route} />
    </div>
  );
}
