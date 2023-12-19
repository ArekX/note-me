import { useEffect } from "preact/hooks";
import { socketManager } from "$frontend/socket-manager.ts";
import { scriptsReady } from "../frontend/hooks/use-scripts-ready.ts";

interface ScriptsProps {
  socketHost: string;
}

export default function Scripts(props: ScriptsProps) {
  useEffect(() => {
    Promise.all([
      socketManager.connect(props.socketHost),
    ]).then(() => scriptsReady.value = true);
  }, []);

  return null;
}
