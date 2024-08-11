import { ComponentChildren } from "preact";

interface PanelProps {
    addClass?: string;
    children: ComponentChildren;
}

export default function Panel(
    {
        addClass = "",
        children,
    }: PanelProps,
) {
    return (
        <div
            class={`rounded-lg text-white border border-b-0 bg-gray-800 border-gray-700 shadow-black/80 shadow-sm mr-5 ml-5 mb-5 p-5 ${addClass}`}
        >
            {children}
        </div>
    );
}
