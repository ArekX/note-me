import { deleteSingleNotification } from "$backend/repository/notification-repository.ts";
import { markSingleNotificationRead } from "$backend/repository/notification-repository.ts";
import {
    deleteUserNotifications,
    getUserNotifications,
    markReadUserNotifications,
    NotificationRecord,
} from "$backend/repository/notification-repository.ts";
import { Payload } from "$types";
import {
    WebSocketClient,
    WebSocketClientList,
    WebSocketHandler,
} from "../websocket-service.ts";
import { WebSocketMessage } from "../webworkers/websocket-worker.ts";

export interface SendNotificationRequest {
    toUserId: number;
    data: NotificationRecord;
}

export type WorkerNotificationRequests = SendNotificationRequest;

export type ClientNotificationRequests =
    | Payload<"getMyNotifications", null>
    | Payload<"deleteAll", null>
    | Payload<"markAllRead", null>
    | Payload<"markSingleRead", { id: number }>
    | Payload<"deleteSingle", { id: number }>;

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

const clients: WebSocketClientList = {};

export const notificationsHandler: WebSocketHandler = {
    onOpen: (client) => clients[client.userId] = client,
    onClose: (client) => delete clients[client.userId],
    onWorkerRequest: (data: WebSocketMessage): Promise<void> => {
        const client = clients[data.payload.toUserId];

        client?.send<NotificationResponses>({
            type: "notification-added",
            payload: data.payload.data,
        });

        return Promise.resolve();
    },
    onClientMessage: async (
        client: WebSocketClient,
        message: ClientNotificationRequests,
    ): Promise<void> => {
        await clientMessageActions[message.type]?.(client, message);
    },
};

const getMyNotifications = async (client: WebSocketClient) => {
    const results = await getUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "notifications-list",
        payload: results,
    });
};

const deleteAll = async (client: WebSocketClient) => {
    await deleteUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "deleted-all",
        payload: null,
    });
};

const markAllRead = async (client: WebSocketClient) => {
    await markReadUserNotifications(client.userId);
    client.send<NotificationResponses>({
        type: "marked-all-read",
        payload: null,
    });
};

const markSingleRead = async (
    client: WebSocketClient,
    message: ClientNotificationRequests,
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
    client: WebSocketClient,
    message: ClientNotificationRequests,
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

const clientMessageActions = {
    getMyNotifications,
    deleteAll,
    markAllRead,
    markSingleRead,
    deleteSingle,
};
