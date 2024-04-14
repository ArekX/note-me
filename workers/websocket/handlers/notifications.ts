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
import {
    NotificationMessages,
    SocketBackendMessage,
} from "$workers/websocket/messages.ts";

export type NotificationResponses =
    | Payload<
        "notifications-list",
        NotificationRecord[]
    >
    | Payload<
        "notification-added",
        NotificationRecord
    >
    | Payload<
        "deleted-all",
        null
    >
    | Payload<
        "marked-all-read",
        null
    >
    | Payload<
        "marked-single-read",
        { id: number }
    >
    | Payload<
        "deleted-single",
        { id: number }
    >;

const getMyNotifications = async (client: SocketClient) => {
    const results = await getUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "notifications-list",
        payload: results,
    });
};

const deleteAll = async (client: SocketClient) => {
    await deleteUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "deleted-all",
        payload: null,
    });
};

const markAllRead = async (client: SocketClient) => {
    await markReadUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "marked-all-read",
        payload: null,
    });
};

const markSingleRead = async (
    client: SocketClient,
    message: NotificationMessages,
) => {
    if (message.type !== "markSingleRead") {
        throw new Error("Invalid message type");
    }
    await markSingleNotificationRead(message.payload.id, client.userId);
    client.send<NotificationResponses>({
        type: "marked-single-read",
        payload: {
            id: message.payload.id,
        },
    });
};

const deleteSingle = async (
    client: SocketClient,
    message: NotificationMessages,
) => {
    if (message.type !== "deleteSingle") {
        throw new Error("Invalid message type");
    }
    await deleteSingleNotification(message.payload.id, client.userId);
    client.send<NotificationResponses>({
        type: "deleted-single",
        payload: {
            id: message.payload.id,
        },
    });
};

type ClientMessageActionFn<T> = (
    client: SocketClient,
    message: Extract<NotificationMessages, { type: T }>,
) => Promise<void>;

type ClientMessageActions = {
    [K in NotificationMessages["type"]]: ClientMessageActionFn<K>;
};

const clientMessageActions: ClientMessageActions = {
    getMyNotifications,
    deleteAll,
    markAllRead,
    markSingleRead,
    deleteSingle,
};

class NotificationHandler
    extends BaseWebSocketHandler<NotificationMessages, SocketBackendMessage> {
    onFrontendMessage(
        client: SocketClient,
        message: NotificationMessages,
    ): void {
        const runAction =
            clientMessageActions[message.type] as ClientMessageActionFn<
                NotificationMessages["type"]
            >;

        runAction(client, message);
    }

    onBackendMessage(data: SocketBackendMessage): Promise<void> {
        const client = this.getClient(data.payload.toUserId);

        client?.send<NotificationResponses>({
            type: "notification-added",
            payload: data.payload.data,
        });

        return Promise.resolve();
    }
}

export const notificationsHandler = new NotificationHandler();
