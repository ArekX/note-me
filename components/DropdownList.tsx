import { IS_BROWSER } from "$fresh/runtime.ts";

export interface DropDownItem {
    value: string;
    label: string;
}

interface DropDownListProps {
    label?: string;
    name?: string;
    value?: string;
    disabled?: boolean;
    items: DropDownItem[];
    onInput?: (value: string) => void;
}

export default function DropdownList(
    { label, items, name, value, onInput, disabled = false }: DropDownListProps,
) {
    return (
        <div class="text-white">
            {label && (
                <label
                    class="bloc text-sm font-bold mb-2 text-white"
                    for={name}
                >
                    {label}
                </label>
            )}
            <select
                name={name}
                value={value}
                disabled={disabled}
                class="outline-none border-1 border-gray-900 bg-gray-700 p-2 w-full rounded-md"
                onInput={IS_BROWSER
                    ? (e) => onInput?.((e.target as HTMLSelectElement).value)
                    : undefined}
            >
                {items.map((item) => (
                    <option value={item.value}>{item.label}</option>
                ))}
            </select>
        </div>
    );
}
