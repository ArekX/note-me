import TextFilter from "./TextFilter.tsx";
import DropDownFilter from "./DropDownFilter.tsx";
import { DropDownItem } from "../DropdownList.tsx";
import { ComponentChildren } from "preact";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";

type OnFilterUpdated<T> = (newFilters: T) => void;

interface FilterItem<DropdownItemType = string> {
    text: () => ComponentChildren;
    list: (items: DropDownItem<DropdownItemType>[]) => ComponentChildren;
}

const filterByText = <T extends object>(
    filters: T,
    key: keyof T,
    onUpdated: OnFilterUpdated<T>,
) => (
    <TextFilter<T>
        filters={filters}
        filterKey={key}
        onChange={onUpdated}
    />
);

const filterByDropDown = <T extends object, DropdownItemType = string>(
    filters: T,
    key: keyof T,
    items: DropDownItem<DropdownItemType>[],
    onUpdated: OnFilterUpdated<T>,
) => (
    <DropDownFilter<T, DropdownItemType>
        filters={filters}
        items={items}
        filterKey={key}
        onChange={onUpdated}
    />
);

export const useFilterFactory = <T extends object, DropdownItemType = string>(
    filters: T,
    onUpdated: OnFilterUpdated<T>,
    debounceTime: number = 500,
) => {
    const handleDebouncedUpdate = useDebouncedCallback(onUpdated, debounceTime);

    return Object.keys(filters).reduce(
        (acc, key) => {
            acc[key as keyof T] = {
                text: () =>
                    filterByText(
                        filters,
                        key as keyof T,
                        handleDebouncedUpdate,
                    ),
                list: (items: DropDownItem<DropdownItemType>[]) =>
                    filterByDropDown(
                        filters,
                        key as keyof T,
                        items,
                        handleDebouncedUpdate,
                    ),
            };
            return acc;
        },
        {} as Record<
            keyof T,
            FilterItem<DropdownItemType>
        >,
    );
};
