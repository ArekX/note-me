import { JSX } from "preact";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import Icon from "$components/Icon.tsx";
import { useEffect } from "preact/hooks";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

export interface PanelItem<Data = unknown> {
    name: string | JSX.Element;
    subtitle?: string | JSX.Element;
    icon?: string;
    data?: Data;
    component: () => JSX.Element;
}

interface SideTabPanelProps<Data = unknown, PassProps = unknown> {
    selectedIndex?: number;
    items: PanelItem<Data>[];
    onSelect?: (item: PanelItem<Data>, index: number) => void;
    styleProps?: Record<string, string>;
    isMobileSidePanelOpen?: boolean;
    passProps?: PassProps;
}

export default function SideTabPanel<T = unknown, PassProps = unknown>(
    {
        items,
        selectedIndex,
        onSelect,
        styleProps,
        passProps,
        isMobileSidePanelOpen = true,
    }: SideTabPanelProps<T, PassProps>,
) {
    const selectedPanel = useSelected<number>(selectedIndex);

    const query = useResponsiveQuery();

    useEffect(() => {
        if (
            selectedIndex !== undefined &&
            !selectedPanel.isSelectedValue(selectedIndex)
        ) {
            selectedPanel.select(selectedIndex);
        }
    }, [selectedIndex]);

    const handleSelect = (item: PanelItem<T>, index: number) => {
        if (!selectedPanel.isSelectedValue(index)) {
            selectedPanel.select(index);
            onSelect?.(item, index);
        }
    };

    const PanelComponent = items[selectedPanel.selected.value!]?.component ??
        null;

    return (
        <>
            <div
                class="relative"
                style={styleProps}
            >
                {(isMobileSidePanelOpen ||
                    query.min("md")) && (
                    <div class="absolute top-0 left-0 bottom-0 right-3/4 max-md:right-0 max-md:left-1/4 max-md:border-l md:border-r border-gray-700/50 py-4 overflow-auto z-20 bg-gray-800">
                        {items.map((item, index) => (
                            <div
                                key={index}
                                class={`w-full mb-2 last:mb-0 p-2 md:rounded-l-lg max-md:rounded-r-lg hover:bg-gray-700/50 
                                        hover:border-gray-600/50 border-t border-l cursor-pointer ${
                                    selectedPanel.isSelectedValue(index)
                                        ? "bg-sky-900 border-sky-600/50 pointer-events-none"
                                        : "border-transparent"
                                }`}
                                onClick={() => handleSelect(item, index)}
                            >
                                <h1 class="text-lg font-semibold">
                                    {item.icon && (
                                        <Icon
                                            name={item.icon}
                                            className="mr-1.5"
                                        />
                                    )}
                                    {item.name}
                                </h1>
                                <span class="block text-sm text-gray-400">
                                    {item.subtitle ?? ""}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <div class="max-md:left-0 left-1/4 right-0 top-0 bottom-0 absolute md:pl-5 overflow-auto">
                    <PanelComponent
                        key={selectedPanel.selected.value!}
                        {...passProps}
                    />
                </div>
            </div>
        </>
    );
}
