import Notifications from "$islands/Notifications.tsx";
import { Logo } from "$components/Logo.tsx";
import { MenuItem, Nav } from "$components/Nav.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { Icon } from "$components/Icon.tsx";
import GroupList from "../islands/groups/GroupList.tsx";

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
      icon: "user",
      name: "Profile",
      link: "/app/profile",
    },
    {
      icon: "cog",
      name: "Settings",
      link: "/app/settings",
    },
    {
      icon: "log-out",
      name: `Logout`,
      link: "/app/logout",
    },
  ];

  return (
    <div class="w-1/5 bg-gray-800 text-white bg-opacity-95">
      <div class="mt-5">
        <div class="flex">
          <div class="flex-1 w-1/3 text-center">
            <a href="/app">
              <Logo white={true} height={25} width={25} /> NoteMe
            </a>
          </div>
          <div class="flex-1 text-center">
            <a
              href="/app/settings"
              class="hover:text-gray-300"
              title="Administration settings"
            >
              <Icon name="cog" />
            </a>
            <Notifications initialNotifications={initialNotifications} />
            <a
              href="/app/profile"
              class="hover:text-gray-300"
              title="Your account"
            >
              <Icon name="user" />
            </a>
            <a href="/app/logout" class="hover:text-gray-300" title="Log out">
              <Icon name="log-out" />
            </a>
          </div>
        </div>
      </div>
      <GroupList />
    </div>
  );
}
