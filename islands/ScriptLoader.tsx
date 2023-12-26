import { useEffect } from "preact/hooks";
import { socketManager } from "$frontend/socket-manager.ts";
import { scriptsReady } from "$frontend/hooks/use-scripts-ready.ts";
import { FrontendUserData, setUserData } from "$frontend/user-data.ts";

interface ScriptsProps {
  socketHost: string;
  userData: FrontendUserData;
}

export default function ScriptLoader(props: ScriptsProps) {
  setUserData(props.userData);

  const waitFor = [
    socketManager.connect(props.socketHost),
  ];

  useEffect(() => {
    Promise.all(waitFor).then(() => scriptsReady.value = true);
  }, []);

  return null;
}
