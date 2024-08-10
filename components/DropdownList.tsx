import { IS_BROWSER } from "$fresh/runtime.ts";

export interface DropDownItem<T> {
    value: T;
    label: string;
}

interface DropDownListProps<T> {
    label?: string;
    labelColor?: "white" | "black";
    name?: string;
    value?: T;
    disabled?: boolean;
    tabIndex?: number;
    items: DropDownItem<T>[];
    onInput?: (value: T) => void;
}

export default function DropdownList<T>(
    {
        label,
        items,
        name,
        value,
        tabIndex,
        onInput,
        disabled = false,
        labelColor = "white",
    }: DropDownListProps<T>,
) {
    const handleInputValue = (e: Event) => {
        const targetIndex = +(e.target as HTMLSelectElement).value;
        onInput?.(items[targetIndex].value);
    };

    return (
        <div class="text-white">
            {label && (
                <label
                    class={`bloc text-sm mb-2 text-${labelColor}`}
                    for={name}
                >
                    {label}
                </label>
            )}
            <select
                name={name}
                tabIndex={tabIndex}
                value={items.findIndex((item) => item.value === value)}
                disabled={disabled}
                class="outline-none border-gray-600/50 bg-gray-700/60 hover:bg-gray-700 border select-input w-full rounded-md"
                onInput={IS_BROWSER ? (e) => handleInputValue(e) : undefined}
            >
                {items.map((item, index) => (
                    <option key={index} value={index}>{item.label}</option>
                ))}
            </select>
        </div>
    );
}
