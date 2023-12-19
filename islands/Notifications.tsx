import { useSignal } from "@preact/signals";
import { Icon } from "$components/Icon.tsx";
import { socketManager } from "$frontend/socket-manager.ts";
import { useScriptsReadyEffect } from "../frontend/hooks/use-scripts-ready.ts";
import {
  ClientNotificationRequests,
  NotificationResponses,
} from "../workers/websocket-handlers/notifications.ts";
import { NotificationRecord } from "../repository/notification-repository.ts";

interface NotificationsProps {
  initialNotifications: NotificationRecord[];
}

export default function Notifications(props: NotificationsProps) {
  const notifications = useSignal<NotificationRecord[]>(
    props.initialNotifications,
  );

  useScriptsReadyEffect(() => {
    socketManager.onMessage<NotificationResponses>((data) => {
      if (data.type == "notifications-list") {
        notifications.value = data.payload;
      } else if (data.type == "notification-added") {
        notifications.value = [...notifications.value, data.payload];
      }
    });

    socketManager.send<ClientNotificationRequests>({
      type: "getMyNotifications",
      payload: null,
    });
  });

  return (
    <div class="text-right pr-5 -mb-6 cursor-pointer relative">
      <span class="notification-badge">
        {notifications.value.length}
      </span>
      <Icon name="notifications" />
    </div>
  );
}
