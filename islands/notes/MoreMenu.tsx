import DropdownMenu from "$islands/DropdownMenu.tsx";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";

type ModeType = "view" | "view-readonly" | "edit-new" | "edit-existing";

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
    | "files"
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
    const sendAction = (action: MenuItemActions) => {
        onMenuItemClick?.(action);
        closeAllPopovers();
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
            name: "Files",
            icon: "file",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("files"),
        },
        {
            name: "Remind me",
            icon: "alarm",
            modes: ["view", "edit-existing", "view-readonly"],
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
            modes: ["view", "edit-existing", "view-readonly"],
            onClick: () => sendAction("help"),
        },
    ].filter(({ modes }) => modes.includes(mode)) as MoreMenuItem[];

    if (items.length === 0) {
        return null;
    }

    return (
        <DropdownMenu
            popoverId="notesMenu-0"
            icon="dots-horizontal-rounded"
            iconSize="lg"
            displayType="inline"
            items={items.map(({ name, icon, onClick }) => ({
                name,
                icon,
                onClick,
            }))}
        />
    );
}
