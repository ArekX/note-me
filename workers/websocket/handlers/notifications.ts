import {
    deleteSingleNotification,
    NotificationRecord,
} from "$backend/repository/notification-repository.ts";
import { markSingleNotificationRead } from "$backend/repository/notification-repository.ts";
import {
    deleteUserNotifications,
    getUserNotifications,
    markReadUserNotifications,
} from "$backend/repository/notification-repository.ts";
import { BaseWebSocketHandler } from "../websocket-handler.ts";
import { SocketClient } from "../types.ts";
import { Payload } from "$types";

export type NotificationFrontendMessage =
    | Payload<"getMyNotifications", null>
    | Payload<"deleteAll", null>
    | Payload<"markAllRead", null>
    | Payload<"markSingleRead", { id: number }>
    | Payload<"deleteSingle", { id: number }>;

export type NotificationFrontendResponse =
    | Payload<
        "notificationsList",
        NotificationRecord[]
    >
    | Payload<
        "notificationAdded",
        NotificationRecord
    >
    | Payload<
        "deletedAll",
        null
    >
    | Payload<
        "markedAllRead",
        null
    >
    | Payload<
        "markedSingleRead",
        { id: number }
    >
    | Payload<
        "deletedSingle",
        { id: number }
    >;

export type NotificationBackendMessage = Payload<
    "addNotification",
    {
        toUserId: number;
        data: NotificationRecord;
    }
>;

const getMyNotifications = async (client: SocketClient) => {
    const results = await getUserNotifications(client.userId);
    client.send<NotificationFrontendResponse>({
        type: "notificationsList",
        payload: results,
    });
};

const deleteAll = async (client: SocketClient) => {
    await deleteUserNotifications(client.userId);
    client.send<NotificationFrontendResponse>({
        type: "deletedAll",
        payload: null,
    });
};

const markAllRead = async (client: SocketClient) => {
    await markReadUserNotifications(client.userId);
    client.send<NotificationFrontendResponse>({
        type: "markedAllRead",
        payload: null,
    });
};

const markSingleRead = async (
    client: SocketClient,
    message: NotificationFrontendMessage,
) => {
    if (message.type !== "markSingleRead") {
        throw new Error("Invalid message type");
    }
    await markSingleNotificationRead(message.payload.id, client.userId);
    client.send<NotificationFrontendResponse>({
        type: "markedSingleRead",
        payload: {
            id: message.payload.id,
        },
    });
};

const deleteSingle = async (
    client: SocketClient,
    message: NotificationFrontendMessage,
) => {
    if (message.type !== "deleteSingle") {
        throw new Error("Invalid message type");
    }
    await deleteSingleNotification(message.payload.id, client.userId);
    client.send<NotificationFrontendResponse>({
        type: "deletedSingle",
        payload: {
            id: message.payload.id,
        },
    });
};

type ClientMessageActionFn<T> = (
    client: SocketClient,
    message: Extract<NotificationFrontendMessage, { type: T }>,
) => Promise<void>;

type ClientMessageActions = {
    [K in NotificationFrontendMessage["type"]]: ClientMessageActionFn<K>;
};

const clientMessageActions: ClientMessageActions = {
    getMyNotifications,
    deleteAll,
    markAllRead,
    markSingleRead,
    deleteSingle,
};

class NotificationHandler extends BaseWebSocketHandler<
    NotificationFrontendMessage,
    NotificationBackendMessage
> {
    onFrontendMessage(
        client: SocketClient,
        message: NotificationFrontendMessage,
    ): void {
        const runAction =
            clientMessageActions[message.type] as ClientMessageActionFn<
                NotificationFrontendMessage["type"]
            >;

        runAction(client, message);
    }

    getAllowedBackendMessages(): NotificationBackendMessage["type"][] {
        return ["addNotification"];
    }

    onBackendScopedMessage(data: NotificationBackendMessage): Promise<void> {
        const client = this.getClient(data.payload.toUserId);

        client?.send<NotificationFrontendResponse>({
            type: "notificationAdded",
            payload: data.payload.data,
        });

        return Promise.resolve();
    }
}

export const notificationsHandler = new NotificationHandler();
