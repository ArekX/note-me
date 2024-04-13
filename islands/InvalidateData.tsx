import { useEffect } from "preact/hooks";
import { clearStorage } from "$frontend/session-storage.ts";

export default function InvalidateData() {
    useEffect(() => {
        clearStorage();
    }, []);

    return null;
}
