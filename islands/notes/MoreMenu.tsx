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

export type MenuItemActions =
    | "preview"
    | "details"
    | "history"
    | "share"
    | "remind"
    | "delete";

interface MoreMenuProps {
    onMenuItemClick?: (name: MenuItemActions) => void;
}

export const MoreMenu = ({ onMenuItemClick }: MoreMenuProps) => {
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

    const sendAction = (action: MenuItemActions) => {
        onMenuItemClick?.(action);
        isVisible.value = false;
    };

    const items: MoreMenuItem[] = [
        {
            name: "Preview",
            icon: "show-alt",
            onClick: () => sendAction("preview"),
        },
        {
            name: "Details", // created by, last update, author, generated table of contents
            icon: "detail",
            onClick: () => sendAction("details"),
        },
        {
            name: "History",
            icon: "history",
            onClick: () => sendAction("history"),
        },
        {
            name: "Share",
            icon: "share-alt",
            onClick: () => sendAction("share"),
        },
        {
            name: "Remind me",
            icon: "alarm",
            onClick: () => sendAction("remind"),
        },
        {
            name: "Delete",
            icon: "minus-circle",
            onClick: () => sendAction("delete"),
        },
    ];

    return (
        <div class="relative inline-block">
            <Button
                color="primary"
                tabIndex={5}
                onClick={() => isVisible.value = !isVisible.value}
            >
                <Icon name="dots-horizontal-rounded" size="lg" />
            </Button>

            {isVisible.value && (
                <div
                    ref={menuRef}
                    class="text-white absolute text-lg right-0 top-full mt-1 drop-shadow-lg bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep"
                >
                    {items.map(({ name, icon, onClick }, index) => (
                        <div
                            key={index}
                            tabIndex={6 + index}
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
};
