import { Icon } from "$components/Icon.tsx";
import { createRef } from "preact";
import { createPortal } from "preact/compat";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useWindowResize } from "$frontend/hooks/use-window-resize.ts";

export interface MenuItem {
    icon: string;
    name: string;
    onClick: () => void;
}

export type MoreMenuItemAction =
    | "add-note"
    | "add-group"
    | "refresh"
    | "rename"
    | "edit"
    | "details"
    | "history"
    | "share"
    | "remind-me"
    | "delete";

interface MoreMenuProps {
    record: TreeRecord;
    onAction: (action: MoreMenuItemAction) => void;
}

export const MoreMenu = (
    { record, onAction }: MoreMenuProps,
) => {
    const menuRef = createRef<HTMLDivElement>();
    const iconRef = createRef<HTMLSpanElement>();

    const repositionMenu = (_width: number, height: number) => {
        if (!menuRef.current || !iconRef.current) {
            return;
        }

        const rect = menuRef.current.getBoundingClientRect();
        const iconRefRect = iconRef.current!.getBoundingClientRect();

        const diff = Math.max(0, iconRefRect.top + rect.height - height);

        menuRef.current.style.top = `${iconRefRect.top - diff}px`;
        menuRef.current.style.left = `${
            iconRefRect.left + iconRefRect.width
        }px`;
    };

    const { isOpen, open, close } = useSinglePopover(
        `${record.type}-${record.id}`,
        menuRef,
        () => repositionMenu(innerWidth, innerHeight),
    );

    const handleOpenMenu = (e: Event) => {
        e.stopPropagation();
        open();
    };

    useWindowResize(menuRef, repositionMenu);

    const groupMenu = [
        {
            name: "Add Note",
            icon: "plus",
            onClick: () => onAction("add-note"),
        },
        {
            name: "Add Group",
            icon: "folder-plus",
            onClick: () => onAction("add-group"),
        },
        {
            name: "Refresh",
            icon: "refresh",
            onClick: () => onAction("refresh"),
        },
    ];

    const noteMenu = [
        {
            name: "Details",
            icon: "detail",
            onClick: () => onAction("details"),
        },
        {
            name: "History",
            icon: "history",
            onClick: () => onAction("history"),
        },
        {
            name: "Share",
            icon: "share-alt",
            onClick: () => onAction("share"),
        },
        {
            name: "Remind me",
            icon: "alarm",
            onClick: () => onAction("remind-me"),
        },
    ];

    const menuItems = [
        ...(record.type === "group" ? groupMenu : noteMenu),
        {
            name: "Rename",
            icon: "edit",
            onClick: () => onAction("rename"),
        },
        {
            name: "Delete",
            icon: "minus-circle",
            onClick: () => onAction("delete"),
        },
    ];

    return (
        <div
            class={`inline-block relative sh cursor-pointer icon-menu ${
                isOpen ? "show-items" : ""
            }`}
            onClick={handleOpenMenu}
        >
            <span ref={iconRef}>
                <Icon name="dots-horizontal-rounded" />
            </span>
            {isOpen &&
                createPortal(
                    <div
                        ref={menuRef}
                        class={`text-white icon-menu-items drop-shadow-lg fixed bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep`}
                    >
                        {menuItems.map((item) => (
                            <div
                                class="hover:bg-gray-700 cursor-pointer p-1 pr-2 pl-2"
                                onClick={(e) => {
                                    item.onClick();
                                    close();
                                    e.stopPropagation();
                                }}
                            >
                                <Icon name={item.icon} /> {item.name}
                            </div>
                        ))}
                    </div>,
                    document.getElementById("icon-menu")!,
                )}
        </div>
    );
};
