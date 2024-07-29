import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    LogoutUserMessage,
    UserBackendMessage,
    UserForceLogoutResponse,
} from "./messages.ts";

const handleLogoutUser: ListenerFn<LogoutUserMessage> = ({
    message,
    service,
}) => {
    const client = service.getClientByUserId(message.user_id);

    client?.send<UserForceLogoutResponse>({
        requestId: message.requestId,
        namespace: "users",
        type: "forceLogoutResponse",
    });
};

export const backendMap: RegisterListenerMap<UserBackendMessage> = {
    logoutUser: handleLogoutUser,
};
