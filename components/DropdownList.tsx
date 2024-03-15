import { IS_BROWSER } from "$fresh/runtime.ts";

interface DropDownListProps {
    label?: string;
    name?: string;
    value?: string;
    items: { value: string, label: string }[];
    onInput?: (value: string) => void
}

export function DropdownList({ label, items, name, value, onInput }: DropDownListProps) {
    return (
        <div class="text-white">
            {label && <label
                class="bloc text-sm font-bold mb-2 text-black"
                for={name}
            >
                {label}
            </label>}
            <select name={name} value={value} class="outline-none border-1 border-gray-900 bg-gray-700 p-2 w-full rounded-md" onInput={IS_BROWSER ? (e) => onInput?.((e.target as HTMLSelectElement).value) : undefined}>
                {items.map((item) => <option value={item.value}>{item.label}</option>)}
            </select>
        </div>
    )

}