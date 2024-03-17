import { Icon } from "$components/Icon.tsx";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface InputProps {
    type?: "text" | "password" | "email";
    label?: string;
    icon?: string;
    name?: string;
    value?: string;
    disabled?: boolean;
    onInput?: (value: string) => void;
    placeholder?: string;
}

export function Input(
    {
        icon,
        label,
        name,
        type,
        value,
        onInput,
        placeholder,
        disabled = false,
    }: InputProps,
) {
    return (
        <div class={`${icon ? "relative" : ""} text-white`}>
            {label && (
                <label
                    class="bloc text-sm font-bold mb-2 text-white"
                    for={name}
                >
                    {label}
                </label>
            )}
            {icon && (
                <div class="absolute inset-y-0 top-6 left-0 flex items-center pl-2 text-gray-400">
                    <Icon name={icon} />
                </div>
            )}
            <input
                type={type}
                name={name}
                disabled={disabled}
                value={value}
                class={`outline-none border-1 ${
                    icon ? "pl-9" : ""
                } border-gray-900 bg-gray-700 p-2 w-full rounded-md`}
                placeholder={placeholder}
                onInput={IS_BROWSER
                    ? (e) =>
                        !disabled &&
                        onInput?.((e.target as HTMLInputElement).value)
                    : undefined}
            />
        </div>
    );
}
