import Notifications from "$islands/notifications/NotificationList.tsx";
import Icon from "$components/Icon.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import LogoutButton from "$islands/sidebar/LogoutButton.tsx";
import EncryptionLockButton from "$islands/encryption/EncryptionLockButton.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

interface SidebarMenuProps {
    showSettings: boolean;
    initialNotifications: NotificationRecord[];
}

export default function SidebarMenu(
    { showSettings, initialNotifications }: SidebarMenuProps,
) {
    const query = useResponsiveQuery();

    if (query.max("sm")) {
        return (
            <div class="w-full text-center">
                {showSettings && (
                    <div>
                        <a
                            href="/app/settings"
                            class="hover:text-gray-300"
                            title="Administration settings"
                        >
                            <Icon name="cog" /> Settings
                        </a>
                    </div>
                )}
                <div>
                    <Notifications
                        initialNotifications={initialNotifications}
                    />
                </div>

                <div>
                    <a
                        href="/app/profile"
                        class="hover:text-gray-300"
                        title="Your account"
                    >
                        <Icon name="user" /> Profile
                    </a>
                </div>
                <div>
                    <EncryptionLockButton />
                </div>
                <div>
                    <LogoutButton />
                </div>
            </div>
        );
    }

    return (
        <div class="flex-1 text-right pr-2 max-lg:text-center">
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
            <EncryptionLockButton />
            <LogoutButton />
        </div>
    );
}
