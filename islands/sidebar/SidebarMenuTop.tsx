import { useMobileMenu } from "$frontend/hooks/use-mobile-menu.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Logo from "$components/Logo.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import HelpButton from "$islands/help/HelpButton.tsx";

interface SidebarMenuProps {
    showSettings: boolean;
}

export default function SidebarMenuTop(
    { showSettings }: SidebarMenuProps,
) {
    const mobileMenu = useMobileMenu();

    const handleOpenSettings = () => {
        mobileMenu.close();
        redirectTo.settings();
    };

    return (
        <div class="text-center w-full flex items-center justify-center">
            <div class="text-right">
                <Button
                    onClick={() => mobileMenu.toggle()}
                    color="transparent"
                    title="Close menu"
                    size="sm"
                    rounded={false}
                    borderClass="border-b-0"
                >
                    <Icon name="menu" />
                </Button>
            </div>
            <a
                onClick={() => redirectTo.root()}
                class="block flex-grow text-center pt-1 cursor-pointer"
            >
                <Logo
                    white
                    height={20}
                    width={20}
                />
                <span class="pl-1">NoteMe</span>
            </a>
            <div>
                {showSettings && (
                    <Button
                        onClick={handleOpenSettings}
                        color="transparent"
                        size="sm"
                        title="Settings"
                        rounded={false}
                        borderClass="border-b-0"
                    >
                        <Icon name="cog" />
                    </Button>
                )}
                <HelpButton />
            </div>
        </div>
    );
}
