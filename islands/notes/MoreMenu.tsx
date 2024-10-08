import DropdownMenu from "$islands/DropdownMenu.tsx";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";
import {
    ResponsiveSize,
    useResponsiveQuery,
} from "$frontend/hooks/use-responsive-query.ts";

type ModeType = "view" | "view-readonly" | "edit-new" | "edit-existing";

export interface MoreMenuItem {
    name: string;
    icon: string;
    maxSize?: ResponsiveSize;
    minSize?: ResponsiveSize;
    modes: ModeType[];
    onClick: () => void;
}

export type MenuItemActions =
    | "preview"
    | "open-viewer"
    | "open-editor"
    | "editor-toggle-protection"
    | "editor-save"
    | "edit"
    | "details"
    | "history"
    | "share"
    | "files"
    | "download"
    | "move"
    | "remind"
    | "help"
    | "delete";

interface MoreMenuProps {
    mode: ModeType;
    inPreviewMode: boolean;
    isProtected?: boolean;
    onMenuItemClick?: (name: MenuItemActions) => void;
}

export default function MoreMenu(
    { mode, inPreviewMode, isProtected, onMenuItemClick }: MoreMenuProps,
) {
    const query = useResponsiveQuery();

    const sendAction = (action: MenuItemActions) => {
        onMenuItemClick?.(action);
        closeAllPopovers();
    };

    const items: MoreMenuItem[] = ([
        {
            name: "Save",
            icon: "save",
            maxSize: "lg",
            modes: ["edit-new", "edit-existing"],
            onClick: () => sendAction("editor-save"),
        },
        {
            name: "Close",
            icon: "minus-circle",
            maxSize: "lg",
            modes: ["edit-existing"],
            onClick: () => sendAction("open-viewer"),
        },
        {
            name: isProtected ? "Unprotect" : "Protect",
            icon: isProtected ? "lock-open-alt" : "lock-alt",
            maxSize: "lg",
            modes: ["edit-existing"],
            onClick: () => sendAction("editor-toggle-protection"),
        },
        {
            name: inPreviewMode ? "Edit mode" : "Preview mode",
            icon: inPreviewMode ? "pencil" : "show",
            modes: ["edit-new", "edit-existing"],
            onClick: () => sendAction(inPreviewMode ? "edit" : "preview"),
        },

        {
            name: "Edit",
            icon: "pencil",
            maxSize: "lg",
            modes: ["view"],
            onClick: () => sendAction("open-editor"),
        },

        {
            name: "Details",
            icon: "detail",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("details"),
        },
        {
            name: "Download",
            icon: "download",
            modes: ["view", "edit-existing", "view-readonly"],
            onClick: () => sendAction("download"),
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
            name: "Move",
            icon: "transfer-alt",
            modes: ["view", "edit-existing"],
            onClick: () => sendAction("move"),
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
            modes: ["view", "edit-existing", "view-readonly", "edit-new"],
            onClick: () => sendAction("help"),
        },
    ] as MoreMenuItem[]).filter(({ modes, minSize = null, maxSize = null }) => {
        if (!modes.includes(mode)) {
            return false;
        }

        if (minSize !== null && !query.min(minSize as ResponsiveSize)) {
            return false;
        }

        if (maxSize !== null && !query.max(maxSize as ResponsiveSize)) {
            return false;
        }

        return true;
    }) as MoreMenuItem[];

    if (items.length === 0) {
        return null;
    }

    return (
        <DropdownMenu
            popoverId="notesMenu-0"
            icon="dots-horizontal-rounded"
            iconSize="lg"
            displayType="inline"
            buttonBorderClass="border border-b-0"
            addButtonClass="inline-block"
            items={items.map(({ name, icon, onClick }) => ({
                name,
                icon,
                onClick,
            }))}
        />
    );
}
