import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import DropdownMenu from "$islands/DropdownMenu.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

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
    | "share"
    | "remind-me"
    | "search-group"
    | "move"
    | "delete";

interface MoreMenuProps {
    container: RecordContainer;
    onAction: (action: MoreMenuItemAction) => void;
}

export default function MoreMenu(
    {
        container,
        onAction,
    }: MoreMenuProps,
) {
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
            name: "Search",
            icon: "search",
            types: ["group"],
            action: "search-group",
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
            types: ["note", "group"],
            action: "details",
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

    const query = useResponsiveQuery();

    return (
        <DropdownMenu
            popoverId={`${container.type.toString()}-${container.id ?? -1}`}
            showDirection={query.max("md") ? "left" : "right"}
            displayType="portal"
            iconOnly
            icon="dots-horizontal-rounded"
            items={menu.map((item) => ({
                name: item.name,
                icon: item.icon,
                onClick: () => onAction(item.action),
            }))}
        />
    );
}
