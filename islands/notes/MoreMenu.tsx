import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { createRef } from "preact";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";

type ModeType = "new" | "existing" | "both";

export interface MoreMenuItem {
    name: string;
    icon: string;
    showOnMode: ModeType;
    onClick: () => void;
}

export type MenuItemActions =
    | "preview"
    | "edit"
    | "details"
    | "history"
    | "share"
    | "remind"
    | "help"
    | "delete";

interface MoreMenuProps {
    mode: ModeType;
    inPreviewMode: boolean;
    onMenuItemClick?: (name: MenuItemActions) => void;
}

export const MoreMenu = (
    { mode, inPreviewMode, onMenuItemClick }: MoreMenuProps,
) => {
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
            name: inPreviewMode ? "Edit mode" : "Preview mode",
            icon: inPreviewMode ? "pencil" : "show",
            showOnMode: "both",
            onClick: () => sendAction(inPreviewMode ? "edit" : "preview"),
        },
        {
            name: "Details", // created by, last update, author, generated table of contents
            icon: "detail",
            showOnMode: "existing",
            onClick: () => sendAction("details"),
        },
        {
            name: "History",
            icon: "history",
            showOnMode: "existing",
            onClick: () => sendAction("history"),
        },
        {
            name: "Share",
            icon: "share-alt",
            showOnMode: "existing",
            onClick: () => sendAction("share"),
        },
        {
            name: "Remind me",
            icon: "alarm",
            showOnMode: "existing",
            onClick: () => sendAction("remind"),
        },
        {
            name: "Delete",
            icon: "minus-circle",
            showOnMode: "existing",
            onClick: () => sendAction("delete"),
        },
        {
            name: "Help",
            icon: "help-circle",
            showOnMode: "both",
            onClick: () => sendAction("help"),
        },
    ].filter((item) =>
        item.showOnMode === mode || item.showOnMode === "both"
    ) as MoreMenuItem[];

    if (items.length === 0) {
        return null;
    }

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
