import DropdownList, { DropDownItem } from "$components/DropdownList.tsx";

interface DropDownFilterProps<T extends object> {
    filters: T;
    filterKey: keyof T;
    items: DropDownItem[];
    onChange: (filters: T) => void;
}

export default function DropDownFilter<T extends object>(
    { filters, filterKey, items, onChange }: DropDownFilterProps<T>,
) {
    return (
        <DropdownList
            value={filters[filterKey] as string ?? ""}
            items={items}
            onInput={(value) => {
                onChange({ ...filters, [filterKey]: value });
            }}
        />
    );
}
