import DropdownMenu from "$islands/DropdownMenu.tsx";
import { DropdownMenuItem } from "$islands/DropdownMenu.tsx";
import Icon from "$components/Icon.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

export interface ListSwitcherItem {
    name: string;
    icon: string;
    onClick: () => void;
}

interface ListSwitcherProps {
    onSelectItem: (item: SwitcherItem) => void;
    selectedItem: SwitcherItem;
}

export interface SwitcherItem {
    type: keyof typeof typeMap;
    label: string;
    icon: string;
    placeholder: string;
}

const typeMap = {
    notes: {
        label: "Notes",
        icon: "note",
        placeholder: "Search notes...",
    },
    reminders: {
        label: "Reminders",
        icon: "alarm",
        placeholder: "Search reminders...",
    },
    shared: {
        label: "Shared with me",
        icon: "share-alt",
        placeholder: "Search shared notes...",
    },
    recycleBin: {
        label: "Recycle Bin",
        icon: "recycle",
        placeholder: "Search recycle bin items...",
    },
};

export default function ListSwitcher({
    onSelectItem,
    selectedItem,
}: ListSwitcherProps) {
    const handleTypeSelect = (key: keyof typeof typeMap) => {
        onSelectItem({
            type: key,
            ...typeMap[key],
        });
    };

    const query = useResponsiveQuery();

    const items: DropdownMenuItem[] = [
        {
            name: "Notes",
            icon: "note",
            onClick: () => handleTypeSelect("notes"),
        },
        {
            name: "Reminders",
            icon: "alarm",
            onClick: () => handleTypeSelect("reminders"),
        },
        {
            name: "Shared with me",
            icon: "share-alt",
            onClick: () => handleTypeSelect("shared"),
        },
        {
            name: "Recycle Bin",
            icon: "recycle",
            onClick: () => handleTypeSelect("recycleBin"),
        },
    ];

    return (
        <DropdownMenu
            items={items}
            label={
                <>
                    <Icon name={selectedItem.icon} size="sm" />{" "}
                    {!query.matches("md") && selectedItem.label}
                </>
            }
            buttonColor="transparent"
            buttonBorderClass="border-b-0"
            buttonSize="sm"
            popoverId="listSwitcher-0"
            displayType="inline"
            inlineDirection="left"
            showDirection="bottom"
        />
    );
}
