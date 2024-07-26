import { ComponentChild } from "preact";
import Icon from "$components/Icon.tsx";

interface SwitcherContainerProps {
    switcherComponent: ComponentChild;
    addClass?: string;
    icons: {
        name: string;
        icon: string;
        onClick: () => void;
    }[];
}

export default function SwitcherContainer({
    switcherComponent,
    addClass = "",
    icons,
}: SwitcherContainerProps) {
    return (
        <div class={`flex select-none ${addClass}`}>
            <div class="flex-1 basis-24">
                {switcherComponent}
            </div>
            <div class="flex-1 text-right opacity-30 hover:opacity-100 pr-1">
                {icons.map(({ name, icon, onClick }) => (
                    <span
                        class="cursor-pointer hover:text-gray-300"
                        title={name}
                        onClick={onClick}
                    >
                        <Icon name={icon} />
                    </span>
                ))}
            </div>
        </div>
    );
}
