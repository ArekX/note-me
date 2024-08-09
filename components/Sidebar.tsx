import Notifications from "$islands/notifications/NotificationList.tsx";
import Logo from "$components/Logo.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import Icon from "$components/Icon.tsx";
import SideBarPanel from "$islands/sidebar/SideBarPanel.tsx";
import LogoutButton from "$islands/sidebar/LogoutButton.tsx";
import { getCurrentMonthWallpaper } from "$frontend/wallpaper.ts";
import EncryptionLockIcon from "$islands/encryption/EncryptionLockButton.tsx";

export interface SidebarProps {
    showSettings: boolean;
    initialNotifications: NotificationRecord[];
}

export default function Sidebar(
    { initialNotifications, showSettings }: SidebarProps,
) {
    const wallpaper = getCurrentMonthWallpaper();
    return (
        <div
            class="w-1/5 bg-gray-800 text-white bg-opacity-90 bg-blend-multiply bg-cover bg-center"
            style={{
                "background-image": `url(${wallpaper})`,
            }}
        >
            <div class="backdrop-blur-xl sidebar-container">
                <div class="mt-5">
                    <div class="flex">
                        <div class="flex-1 w-1/3 text-left pl-2">
                            <a href="/app/note" f-partial={"/app/note"}>
                                <Logo white={true} height={25} width={25} />
                                {" "}
                                NoteMe
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
                            <EncryptionLockIcon />
                            <LogoutButton />
                        </div>
                    </div>
                </div>

                <SideBarPanel />
            </div>
        </div>
    );
}
