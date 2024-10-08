import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    AddNotificationMessage,
    NotificationBackendMessage,
    NotificationFrontendResponse,
} from "./messages.ts";

const handleAddNotification: ListenerFn<AddNotificationMessage> = ({
    message,
    service,
}) => {
    const client = service.getClientByUserId(message.toUserId);

    client?.send<NotificationFrontendResponse>({
        requestId: message.requestId,
        namespace: "notifications",
        type: "notificationAdded",
        record: message.data,
    });
};

export const backendMap: RegisterListenerMap<NotificationBackendMessage> = {
    addNotification: handleAddNotification,
};
