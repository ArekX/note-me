import { Icon } from "$components/Icon.tsx";
import { createRef } from "preact";
import { createPortal } from "preact/compat";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useWindowResize } from "$frontend/hooks/use-window-resize.ts";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";

export interface MenuItem {
    icon: string;
    name: string;
    types: RecordContainer["type"][];
    action: MoreMenuItemAction;
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
    | "move"
    | "delete";

interface MoreMenuProps {
    container: RecordContainer;
    onAction: (action: MoreMenuItemAction) => void;
}

export const MoreMenu = (
    {
        container,
        onAction,
    }: MoreMenuProps,
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
        `${container.type.toString()}-${container.id ?? -1}`,
        menuRef,
        () => repositionMenu(innerWidth, innerHeight),
    );

    const handleOpenMenu = (e: Event) => {
        e.stopPropagation();
        open();
    };

    useWindowResize(menuRef, repositionMenu);

    const menu: MenuItem[] = [
        {
            name: "Add Note",
            icon: "plus",
            types: ["group"],
            action: "add-note",
        },
        {
            name: "Add Group",
            icon: "folder-plus",
            types: ["group"],
            action: "add-group",
        },
        {
            name: "Refresh",
            icon: "refresh",
            types: ["group"],
            action: "refresh",
        },
        {
            name: "Details",
            icon: "detail",
            types: ["note"],
            action: "details",
        },
        {
            name: "History",
            icon: "history",
            types: ["note"],
            action: "history",
        },
        {
            name: "Share",
            icon: "share-alt",
            types: ["note"],
            action: "share",
        },
        {
            name: "Remind me",
            icon: "alarm",
            types: ["note"],
            action: "remind-me",
        },
        {
            name: "Move",
            icon: "transfer-alt",
            types: ["group", "note"],
            action: "move",
        },
        {
            name: "Rename",
            icon: "edit",
            types: ["group", "note"],
            action: "rename",
        },
        {
            name: "Delete",
            icon: "minus-circle",
            types: ["group", "note"],
            action: "delete",
        },
    ].filter((m) => m.types.includes(container.type)) as MenuItem[];

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
                        {menu.map((item) => (
                            <div
                                class="hover:bg-gray-700 cursor-pointer p-1 pr-2 pl-2"
                                onClick={(e) => {
                                    onAction(item.action);
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
