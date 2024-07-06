import { useEffect } from "preact/hooks";
import { connect } from "$frontend/socket-manager.ts";
import { FrontendUserData, setupUserData } from "$frontend/hooks/use-user.ts";

interface ScriptsProps {
    socketHost: string;
    userData: FrontendUserData;
}

export default function IslandInitializer(props: ScriptsProps) {
    setupUserData(props.userData);

    const connectToSocketManager = async () => {
        const url = new URL(props.socketHost);
        url.searchParams.set("csrfToken", props.userData.csrfToken);
        return await connect(url);
    };

    useEffect(() => {
        connectToSocketManager();
    }, []);

    return null;
}
