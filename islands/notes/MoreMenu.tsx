import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { createRef } from "preact";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";

type ModeType = "view" | "edit-new" | "edit-existing";

export interface MoreMenuItem {
    name: string;
    icon: string;
    modes: ModeType[];
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

export default function MoreMenu(
    { mode, inPreviewMode, onMenuItemClick }: MoreMenuProps,
) {
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
            modes: ["edit-new", "edit-existing"],
            onClick: () => sendAction(inPreviewMode ? "edit" : "preview"),
        },
        {
            name: "Details",
            icon: "detail",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("details"),
        },
        {
            name: "History",
            icon: "history",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("history"),
        },
        {
            name: "Share",
            icon: "share-alt",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("share"),
        },
        {
            name: "Remind me",
            icon: "alarm",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("remind"),
        },
        {
            name: "Delete",
            icon: "minus-circle",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("delete"),
        },
        {
            name: "Help",
            icon: "help-circle",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("help"),
        },
    ].filter(({ modes }) => modes.includes(mode)) as MoreMenuItem[];

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
}
