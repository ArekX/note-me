import { clearStorage } from "$frontend/session-storage.ts";
import { Icon } from "$components/Icon.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";

export const LogoutButton = () => {
    const handleLogOut = () => {
        clearStorage();
        redirectTo.logout();
    };

    return (
        <a
            onClick={handleLogOut}
            class="hover:text-gray-300 cursor-pointer"
            title="Log out"
        >
            <Icon name="log-out" />
        </a>
    );
};
