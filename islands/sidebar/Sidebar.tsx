import { NotificationRecord } from "../../workers/database/query/notification-repository.ts";
import SideBarPanel from "$islands/sidebar/SideBarPanel.tsx";
import { getCurrentMonthWallpaper } from "$frontend/wallpaper.ts";
import SidebarMenu from "$islands/sidebar/SidebarMenu.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import { useSignal } from "@preact/signals";
import { useMobileMenu } from "$frontend/hooks/use-mobile-menu.ts";
import SidebarMenuTop from "$islands/sidebar/SidebarMenuTop.tsx";
import { IS_BROWSER } from "$fresh/runtime.ts";

export interface SidebarProps {
    showSettings: boolean;
    initialNotifications: NotificationRecord[];
}

export default function Sidebar(
    { initialNotifications, showSettings }: SidebarProps,
) {
    const wallpaper = getCurrentMonthWallpaper();
    const isOpen = useSignal(false);
    const query = useResponsiveQuery();

    const mobileMenu = useMobileMenu();

    if (IS_BROWSER && query.isMobile() && !mobileMenu.isMenuOpen.value) {
        return (
            <div class="w-full text-white border-b border-gray-600/50">
                <SidebarMenuTop showSettings={showSettings} />
            </div>
        );
    }

    return (
        <div
            class={`w-1/5 sidebar-panel max-md:w-full h-full max-md:absolute max-md:left-0 max-md:right-0
                  bg-gray-800 text-white bg-opacity-90 bg-blend-multiply bg-cover bg-center z-10`}
            style={{
                "background-image": `url(${wallpaper})`,
            }}
        >
            <div class="backdrop-blur-xl h-full flex flex-col flex-nowrap justify-start items-stretch content-start">
                {IS_BROWSER && (
                    <SidebarMenu
                        initialNotifications={initialNotifications}
                        showSettings={showSettings}
                        isOpen={isOpen.value}
                        onSetOpen={(value) => isOpen.value = value}
                    />
                )}

                {IS_BROWSER && <SideBarPanel />}
            </div>
        </div>
    );
}
