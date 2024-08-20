import Logo from "$components/Logo.tsx";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import SideBarPanel from "$islands/sidebar/SideBarPanel.tsx";
import { getCurrentMonthWallpaper } from "$frontend/wallpaper.ts";
import SidebarMenu from "$islands/sidebar/SidebarMenu.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";

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

    const logoSize = query.max("md") ? 20 : 25;

    if (query.max("sm") && !isOpen.value) {
        return (
            <div class="absolute left-2 bottom-2 z-20">
                <Button onClick={() => isOpen.value = true}>
                    <Icon name="menu" size="sm" />
                </Button>
            </div>
        );
    }

    return (
        <div
            class={`w-1/5 max-md:w-full max-md:absolute max-md:left-0 max-md:right-0 ${
                isOpen.value ? "" : (query.min("md") ? "" : "hidden")
            } bg-gray-800 text-white bg-opacity-90 bg-blend-multiply bg-cover bg-center z-10 h-full`}
            style={{
                "background-image": `url(${wallpaper})`,
            }}
        >
            <div class="backdrop-blur-xl h-full flex flex-col flex-nowrap justify-start items-stretch content-start">
                <div class="max-md:mt-0 max-md:pt-5">
                    <div class="flex pt-3">
                        {query.max("sm") && (
                            <div class="absolute left-2 top-2">
                                <Button onClick={() => isOpen.value = false}>
                                    <Icon name="menu" size="sm" />
                                </Button>
                            </div>
                        )}
                        <div class="text-left pl-2 hidden md:block">
                            <a href="/app/note" f-partial={"/app/note"}>
                                {query.min("lg") && (
                                    <Logo
                                        white={true}
                                        height={logoSize}
                                        width={logoSize}
                                    />
                                )}
                                <span class="max-xl:hidden pl-1">NoteMe</span>
                            </a>
                        </div>

                        <SidebarMenu
                            initialNotifications={initialNotifications}
                            showSettings={showSettings}
                        />
                    </div>
                </div>

                <SideBarPanel />
            </div>
        </div>
    );
}
