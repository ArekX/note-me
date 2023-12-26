import {
  getUserNotifications,
  NotificationRecord,
} from "../../repository/notification-repository.ts";
import { Payload } from "$types";
import {
  WebSocketClient,
  WebSocketClientList,
  WebSocketHandler,
} from "../websocket-service.ts";
import { WebSocketMessage } from "../services/websocket-server.ts";

export interface SendNotificationRequest {
  toUserId: number;
  data: NotificationRecord;
}

export type WorkerNotificationRequests = SendNotificationRequest;

export type ClientNotificationRequests = Payload<"getMyNotifications", null>;

export type NotificationResponses =
  | Payload<
    "notifications-list",
    NotificationRecord[]
  >
  | Payload<
    "notification-added",
    NotificationRecord
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
    await clientMessageActions[message.type]?.(client);
  },
};

const getMyNotifications = async (client: WebSocketClient) => {
  const results = await getUserNotifications(client.userId);
  client.send<NotificationResponses>({
    type: "notifications-list",
    payload: results,
  });
};

const clientMessageActions = {
  getMyNotifications,
};
