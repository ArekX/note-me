import { type Signal, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface NotificationsProps {
  count?: Signal<number>;
}

type Notification = string;

function connect() {
  console.log("component connected");
  const socket = new WebSocket("ws://localhost:8080");
  socket.addEventListener("open", () => {
    console.log("connected");
  });
  socket.addEventListener("message", (event) => {
    console.log("message received", event.data);
  });
  socket.addEventListener("close", () => {
    console.log("disconnected");
  });
}

export default function Notifications(props: NotificationsProps) {
  const notifications = useSignal<Notification[]>([]);

  useEffect(() => {
    connect();
  }, []);

  return (
    <div class="flex gap-8 py-6">
      Notifications:
      <ul>
        {notifications.value.map((notification) => <li>{notification}</li>)}
      </ul>
    </div>
  );
}
