import { ComponentChild, ComponentChildren } from "preact";

interface SidebarPanelContentsProps {
    controlPanel?: ComponentChild;
    controlPanelBorder?: boolean;
    children: ComponentChildren;
}

export default function SidebarPanelContents({
    controlPanel,
    controlPanelBorder = true,
    children,
}: SidebarPanelContentsProps) {
    return (
        <>
            {controlPanel && (
                <div
                    class={`${
                        controlPanelBorder ? "border-b" : ""
                    } border-gray-600/50`}
                >
                    {controlPanel}
                </div>
            )}

            <div class="flex-grow overflow-auto content-sidebar">
                {children}
            </div>
        </>
    );
}
