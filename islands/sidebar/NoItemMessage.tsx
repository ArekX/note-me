import { ComponentChildren } from "preact";
import Icon from "$components/Icon.tsx";

interface NoItemMessageProps {
    message: string | ComponentChildren;
    removePadding?: boolean;
    icon: string;
}

export default function NoItemMessage({
    message,
    removePadding,
    icon,
}: NoItemMessageProps) {
    return (
        <div
            class={`text-gray-400 ${removePadding ? "" : "pt-14"} text-center`}
        >
            <div class="mb-2">
                <Icon name={icon} size="5xl" />
            </div>
            {message}
        </div>
    );
}
