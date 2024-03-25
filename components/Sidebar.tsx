import Notifications from "../islands/notifications/NotificationList.tsx";
import { Logo } from "$components/Logo.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { Icon } from "$components/Icon.tsx";
import GroupList from "../islands/groups/GroupList.tsx";
import { ListPanel } from "../islands/sidebar/SideBarPanel.tsx";

export interface SidebarProps {
    showSettings: boolean;
    initialNotifications: NotificationRecord[];
}

export function Sidebar(
    { initialNotifications, showSettings }: SidebarProps,
) {
    return (
        <div class="w-1/5 bg-gray-800 text-white bg-opacity-95">
            <div class="mt-5">
                <div class="flex">
                    <div class="flex-1 w-1/3 text-left pl-2">
                        <a href="/app">
                            <Logo white={true} height={25} width={25} /> NoteMe
                        </a>
                    </div>
                    <div class="flex-1 text-right pr-2">
                        {showSettings && (
                            <a
                                href="/app/settings"
                                class="hover:text-gray-300"
                                title="Administration settings"
                            >
                                <Icon name="cog" />
                            </a>
                        )}
                        <Notifications
                            initialNotifications={initialNotifications}
                        />
                        <a
                            href="/app/profile"
                            class="hover:text-gray-300"
                            title="Your account"
                        >
                            <Icon name="user" />
                        </a>
                        <a
                            href="/app/logout"
                            class="hover:text-gray-300"
                            title="Log out"
                        >
                            <Icon name="log-out" />
                        </a>
                    </div>
                </div>
            </div>
            <ListPanel />
        </div>
    );
}
