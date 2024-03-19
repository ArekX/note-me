import { signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export const scriptsReady = signal(false);

export const useScriptsReadyEffect = (callback: () => void) => {
    useEffect(() => {
        if (scriptsReady.value) {
            return callback();
        }
    }, [scriptsReady.value]);
};
