import { Panel } from "$components/Panel.tsx";
import Notifications from "$islands/Notifications.tsx";

export default function Page() {
  return (
    <Panel>
      Testing web sockets!
      <Notifications />
    </Panel>
  );
}
