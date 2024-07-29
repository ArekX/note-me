import { useEffect } from "preact/hooks";
import { connect } from "$frontend/socket-manager.ts";
import { FrontendUserData, setupUserData } from "$frontend/hooks/use-user.ts";
import { initializeProtectionLock } from "../frontend/hooks/use-protection-lock.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { UserFrontendResponse } from "$workers/websocket/api/users/messages.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { clearStorage } from "$frontend/session-storage.ts";

interface ScriptsProps {
    socketHost: string;
    userData: FrontendUserData;
}

export default function IslandInitializer(props: ScriptsProps) {
    setupUserData(props.userData);

    const connectToSocketManager = async () => {
        const url = new URL(props.socketHost);
        url.searchParams.set("csrfToken", props.userData.csrfToken);
        return await connect(url);
    };

    useWebsocketService<UserFrontendResponse>({
        eventMap: {
            users: {
                forceLogoutResponse: () => {
                    clearStorage();
                    redirectTo.logout();
                },
            },
        },
    });

    useEffect(() => {
        connectToSocketManager();
        initializeProtectionLock();
    }, []);

    return null;
}
