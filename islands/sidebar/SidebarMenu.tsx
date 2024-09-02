import NotificationList from "$islands/notifications/NotificationList.tsx";
import Icon from "$components/Icon.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import LogoutButton from "$islands/sidebar/LogoutButton.tsx";
import EncryptionLockButton from "$islands/encryption/EncryptionLockButton.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Logo from "$components/Logo.tsx";
import SidebarMenuTop from "$islands/sidebar/SidebarMenuTop.tsx";
import HelpButton from "$islands/help/HelpButton.tsx";

interface SidebarMenuProps {
    showSettings: boolean;
    initialNotifications: NotificationRecord[];
    isOpen: boolean;
    onSetOpen: (isOpen: boolean) => void;
}

const MobileSidebarMenu = (
    { showSettings, initialNotifications, onSetOpen }: Omit<
        SidebarMenuProps,
        "isOpen"
    >,
) => {
    return (
        <>
            <SidebarMenuTop showSettings={showSettings} />
            <div class="w-full grid grid-cols-2 gap-2 pb-2 pt-3 border-t border-gray-600/50">
                <NotificationList
                    initialNotifications={initialNotifications}
                />

                <div class="pr-5 text-right">
                    <a
                        href="/app/profile"
                        title="Your account"
                        class="hover:text-gray-300 cursor-pointer"
                        onClick={() => onSetOpen(false)}
                    >
                        <Icon name="user" /> Profile
                    </a>
                </div>
                <div class="pl-5">
                    <EncryptionLockButton />
                </div>
                <div class="pr-5 text-right">
                    <LogoutButton />
                </div>
            </div>
        </>
    );
};

const DesktopSidebarMenu = (
    { showSettings, initialNotifications }: Pick<
        SidebarMenuProps,
        "showSettings" | "initialNotifications"
    >,
) => {
    const query = useResponsiveQuery();
    const logoSize = query.max("md") ? 20 : 25;
    return (
        <div class="flex items-center justify-center p-2">
            <div class="flex-grow text-left hidden lg:block">
                <a href="/app/note" f-partial={"/app/note"}>
                    <Logo
                        white={true}
                        height={logoSize}
                        width={logoSize}
                    />

                    <span class="pl-1 hidden xl:inline-block">NoteMe</span>
                </a>
            </div>

            <div class="text-right max-lg:text-center">
                {query.max("md") && (
                    <a
                        href="/app/note"
                        class="hover:text-gray-300 block pb-2"
                        title="Home"
                    >
                        <Logo
                            white={true}
                            height={16}
                            width={16}
                        />{" "}
                        <span class="pl-1k">NoteMe</span>
                    </a>
                )}
                {showSettings && (
                    <a
                        href="/app/settings"
                        class="hover:text-gray-300"
                        title="Administration settings"
                    >
                        <Icon name="cog" />
                    </a>
                )}
                <NotificationList
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
                <HelpButton />
                <LogoutButton />
            </div>
        </div>
    );
};

export default function SidebarMenu(
    { showSettings, initialNotifications, onSetOpen }: SidebarMenuProps,
) {
    const query = useResponsiveQuery();

    return (
        <div>
            {query.max("sm")
                ? (
                    <MobileSidebarMenu
                        showSettings={showSettings}
                        initialNotifications={initialNotifications}
                        onSetOpen={onSetOpen}
                    />
                )
                : (
                    <DesktopSidebarMenu
                        showSettings={showSettings}
                        initialNotifications={initialNotifications}
                    />
                )}
        </div>
    );
}
