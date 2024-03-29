import { clearStorage } from "$frontend/session-storage.ts";
import { Icon } from "$components/Icon.tsx";

export const LogoutButton = () => {
    const handleLogOut = () => {
        clearStorage();
        window.location.href = "/app/logout";
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
