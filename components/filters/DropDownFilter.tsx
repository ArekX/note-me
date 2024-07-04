import DropdownList, { DropDownItem } from "$components/DropdownList.tsx";

interface DropDownFilterProps<T extends object, DropdownItemType = string> {
    filters: T;
    filterKey: keyof T;
    items: DropDownItem<DropdownItemType>[];
    onChange: (filters: T) => void;
}

export default function DropDownFilter<
    T extends object,
    DropdownItemType = string,
>(
    { filters, filterKey, items, onChange }: DropDownFilterProps<
        T,
        DropdownItemType
    >,
) {
    return (
        <DropdownList<DropdownItemType>
            value={filters[filterKey] as DropdownItemType}
            items={items}
            onInput={(value) => {
                onChange({ ...filters, [filterKey]: value });
            }}
        />
    );
}
