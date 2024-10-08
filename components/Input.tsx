import Icon from "$components/Icon.tsx";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface InputProps {
    type?:
        | "text"
        | "number"
        | "password"
        | "email"
        | "date"
        | "time"
        | "checkbox";
    labelColor?: "white" | "black";
    label?: string;
    icon?: string;
    name?: string;
    min?: string;
    value?: string;
    tabIndex?: number;
    disabled?: boolean;
    disableAutocomplete?: boolean;
    onInput?: (value: string) => void;
    onKeydown?: (e: KeyboardEvent) => void;
    placeholder?: string;
}

export default function Input(
    {
        icon,
        label,
        name,
        type,
        value,
        min,
        onInput,
        onKeydown,
        tabIndex,
        labelColor = "white",
        placeholder,
        disableAutocomplete,
        disabled = false,
    }: InputProps,
) {
    return (
        <div class={`${icon ? "relative" : ""} text-white`}>
            {label && (
                <label
                    class={`bloc text-sm mb-2 text-${labelColor}-400`}
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
                tabIndex={tabIndex}
                autoComplete={disableAutocomplete ? "off" : undefined}
                min={min}
                class={`outline-none border-1 ${
                    icon ? "pl-9" : ""
                } border-gray-600/50 bg-gray-700/60 hover:bg-gray-700 focus:border-gray-600 border border-b-0 p-2 w-full rounded-md`}
                placeholder={placeholder}
                onInput={IS_BROWSER
                    ? (e) =>
                        !disabled &&
                        onInput?.((e.target as HTMLInputElement).value)
                    : undefined}
                onKeyDown={IS_BROWSER ? onKeydown : undefined}
            />
        </div>
    );
}
