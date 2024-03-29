import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { createRef } from "preact";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";

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
    const menuRef = createRef<HTMLDivElement>();

    const {
        isOpen,
        open,
        close,
    } = useSinglePopover("notesMenu-0", menuRef, () => {});

    const sendAction = (action: MenuItemActions) => {
        onMenuItemClick?.(action);
        close();
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
                onClick={open}
            >
                <Icon name="dots-horizontal-rounded" size="lg" />
            </Button>

            {isOpen && (
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
