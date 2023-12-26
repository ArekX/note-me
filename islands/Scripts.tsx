import { useEffect } from "preact/hooks";
import { socketManager } from "$frontend/socket-manager.ts";
import { scriptsReady } from "$frontend/hooks/use-scripts-ready.ts";
import { FrontendUserData, setUserData } from "$frontend/user-data.ts";

interface ScriptsProps {
  socketHost: string;
  userData: FrontendUserData;
}

export default function Scripts(props: ScriptsProps) {
  useEffect(() => {
    setUserData(props.userData);

    Promise.all([
      socketManager.connect(props.socketHost),
    ]).then(() => scriptsReady.value = true);
  }, []);

  return null;
}
