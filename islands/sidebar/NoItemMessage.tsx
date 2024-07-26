import { ComponentChildren } from "preact";
import Icon from "$components/Icon.tsx";

interface NoItemMessageProps {
    message: string | ComponentChildren;
    icon: string;
}

export default function NoItemMessage({
    message,
    icon,
}: NoItemMessageProps) {
    return (
        <div class=" text-gray-500 pt-14 text-center">
            <div class="mb-2">
                <Icon name={icon} size="5xl" />
            </div>
            {message}
        </div>
    );
}
