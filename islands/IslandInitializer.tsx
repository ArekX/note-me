import { useEffect } from "preact/hooks";
import { connect } from "$frontend/socket-manager.ts";
import { FrontendUserData, setupUserData } from "$frontend/hooks/use-user.ts";
import { initializeProtectionLock } from "../frontend/hooks/use-protection-lock.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { UserFrontendResponse } from "$workers/websocket/api/users/messages.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { clearStorage } from "$frontend/session-storage.ts";
import Loader from "$islands/Loader.tsx";
import { useSignal } from "@preact/signals";
import { mermaid } from "$frontend/deps.ts";

interface ScriptsProps {
    socketHost: string;
    userData: FrontendUserData;
}

export default function IslandInitializer(props: ScriptsProps) {
    setupUserData(props.userData);

    const isInitialied = useSignal(false);

    const initializeLibraries = () => {
        mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
                // Background colors
                primaryColor: "#2d3748", // Dark gray for primary elements
                primaryTextColor: "#e2e8f0", // Light gray text
                primaryBorderColor: "#4a5568", // Medium gray borders

                // Secondary colors
                secondaryColor: "#1a202c", // Darker background
                tertiaryColor: "#2d3748", // Medium dark

                // Background and surfaces
                background: "#0f1419", // Very dark background
                mainBkg: "#1a202c", // Main background
                secondBkg: "#2d3748", // Secondary background

                // Lines and edges
                lineColor: "#63b3ed", // Light blue for connections
                edgeLabelBackground: "#1a202c", // Dark background for edge labels

                // Text colors
                textColor: "#e2e8f0", // Primary text
                labelTextColor: "#cbd5e0", // Label text

                // Node colors for flowcharts
                fillType0: "#1e4361ff", // Blue (c0)
                fillType1: "#24583aff", // Green (c1)
                fillType2: "#653a17ff", // Orange (c2)
                fillType3: "#523f79ff", // Purple (c3)
                fillType4: "#236d69ff", // Teal (c4)
                fillType5: "#792424ff", // Red (c5)
                fillType6: "#4e3a11ff", // Yellow (c6)
                fillType7: "#3a424eff", // Gray (c7)

                // Class colors for sequence diagrams
                c0: "#1e4361ff", // Blue
                c1: "#24583aff", // Green
                c2: "#653a17ff", // Orange
                c3: "#523f79ff", // Purple
                c4: "#236d69ff", // Teal
                c5: "#792424ff", // Red
                c6: "#4e3a11ff", // Yellow
                c7: "#3a424eff", // Gray

                // Pie chart colors
                pie1: "#1e4361ff", // c0
                pie2: "#24583aff", // c1
                pie3: "#653a17ff", // c2
                pie4: "#523f79ff", // c3
                pie5: "#236d69ff", // c4
                pie6: "#792424ff", // c5
                pie7: "#4e3a11ff", // c6
                pie8: "#3a424eff", // c7
                pie9: "#0c2b45ff", // c0 (repeat)
                pie10: "#164329ff", // c1 (repeat)
                pie11: "#3f3939ff", // c2 (repeat)
                pie12: "#3a3445ff", // c3 (repeat)

                // Gantt chart colors
                cScale0: "#1e4361ff", // c0
                cScale1: "#24583aff", // c1
                cScale2: "#653a17ff", // c2

                // Git graph colors
                git0: "#1e4361ff", // c0
                git1: "#24583aff", // c1
                git2: "#653a17ff", // c2
                git3: "#523f79ff", // c3
                git4: "#236d69ff", // c4
                git5: "#792424ff", // c5
                git6: "#4e3a11ff", // c6
                git7: "#3a424eff", // c7

                // Grid and section colors
                gridColor: "#4a5568",
                sectionBkgColor: "#2d3748",
                altSectionBkgColor: "#1a202c",

                // Special elements
                errorBkgColor: "#e53e3e",
                errorTextColor: "#ffffff",

                // Note colors
                noteBkgColor: "#2d3748",
                noteBorderColor: "#4a5568",
                noteTextColor: "#e2e8f0",
            },
        });
    };

    const connectToSocketManager = async () => {
        const url = new URL(props.socketHost);
        url.searchParams.set("csrfToken", props.userData.csrfToken);
        await connect(url);
        isInitialied.value = true;
    };

    useWebsocketService<UserFrontendResponse>({
        eventMap: {
            users: {
                forceLogoutResponse: () => {
                    clearStorage();
                    redirectTo.logout();
                },
            },
        },
    });

    useEffect(() => {
        initializeLibraries();
        connectToSocketManager();
        initializeProtectionLock();
    }, []);

    if (isInitialied.value) {
        return null;
    }

    return (
        <div class="island-initalizer">
            <Loader>Loading application...</Loader>
        </div>
    );
}
