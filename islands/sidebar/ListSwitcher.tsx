import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";

export interface ListSwitcherItem {
    name: string;
    icon: string;
    onClick: () => void;
}

interface ListSwitcherProps {
    currentItem: string;
    currentIcon: string;
    items: ListSwitcherItem[];
}

export default function ListSwitcher({
    items,
    currentItem,
    currentIcon,
}: ListSwitcherProps) {
    const isVisible = useSignal(false);
    const menuRef = createRef<HTMLDivElement>();

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const handleDocumentClick = (event: Event) => {
            if (!menuRef.current!) {
                isVisible.value = false;
                return;
            }
            if (menuRef.current.contains(event.target as Node)) {
                return;
            }

            isVisible.value = false;
        };

        document.body.addEventListener("click", handleDocumentClick);

        return () => {
            document.body.removeEventListener("click", handleDocumentClick);
        };
    }, [menuRef]);

    return (
        <div class="cursor-pointer relative inline-block">
            <div
                onClick={() => isVisible.value = !isVisible.value}
                class="text-sm p-1"
            >
                <span class="pr-1">
                    <Icon name={currentIcon} size="sm" />
                </span>
                {currentItem}{" "}
                <Icon name="chevron-down" size="sm" type="solid" />
            </div>

            {isVisible.value && (
                <div
                    ref={menuRef}
                    class="text-white absolute text-lg left-0 z-50 top-full mt-1 drop-shadow-lg bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep"
                >
                    {items.map(({ name, icon, onClick }, index) => (
                        <div
                            key={index}
                            class="hover:bg-gray-700 cursor-pointer p-1 pl-2 pr-2"
                            onClick={onClick}
                        >
                            <Icon name={icon} /> {name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
