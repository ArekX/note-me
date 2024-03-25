import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";

export interface MoreMenuItem {
    name: string;
    icon: string;
    onClick: () => void;
}

interface MoreMenuProps {
    items: MoreMenuItem[];
}

export const MoreMenu = ({ items }: MoreMenuProps) => {
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
        <div class="relative inline-block">
            <Button
                color="primary"
                onClick={() => isVisible.value = !isVisible.value}
            >
                <Icon name="dots-horizontal-rounded" size="sm" />
            </Button>

            {isVisible.value && (
                <div
                    ref={menuRef}
                    class="text-white absolute right-0 top-full mt-1 drop-shadow-lg bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep"
                >
                    {items.map(({ name, icon, onClick }, index) => (
                        <div
                            key={index}
                            class="hover:bg-gray-700 cursor-pointer pr-2 pl-2"
                            onClick={onClick}
                        >
                            <Icon name={icon} /> {name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
