import {
  WebSocketClientList,
  WebSocketHandler,
  WebSocketService,
} from "../websocket-service.ts";

let service: WebSocketService | null = null;

interface SendNotificationRequest {
  toUserId: number;
  message: string;
}

export type NotificationMessages = SendNotificationRequest;

const clients: WebSocketClientList = {};

export const notificationsHandler: WebSocketHandler<NotificationMessages> = {
  onRegister: (parentService) => service = parentService,
  onOpen: (client) => clients[client.userId] = client,
  onClose: (client) => delete clients[client.userId],
  onWorkerRequest: (data: NotificationMessages): Promise<void> => {
    const client = clients[data.toUserId];
    if (client) {
      service?.sendTo(client.clientId, {
        type: "notification",
        payload: {
          message: data.message,
        },
      });
    }

    return Promise.resolve();
  },
  onClientMessage: () => {},
};
