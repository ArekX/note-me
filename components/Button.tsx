import { ComponentChildren } from "preact";

interface ButtonProps {
    disabled?: boolean;
    setAsDefault?: boolean;
    children?: ComponentChildren;
    size?: ButtonSize;
    title?: string;
    color?: ButtonColors;
    type?: "button" | "submit";
    addClass?: string;
    tabIndex?: number;
    onClick?: (event: Event) => void;
}

const buttonColors = {
    primary: "bg-gray-500 hover:bg-gray-600 text-white",
    warning: "bg-yellow-700 hover:bg-yellow-600 text-white",
    success: "bg-sky-900 hover:bg-sky-600 text-white",
    successDisabled: "bg-sky-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    transparent: "bg-transparent hover:bg-gray-700/25",
};

const sizeTypes = {
    "xs": "px-2 py-1 text-xs",
    "sm": "px-4 py-1",
    "md": "px-6 py-2",
};

export type ButtonColors = keyof typeof buttonColors;

export type ButtonSize = keyof typeof sizeTypes;

export default function Button(
    {
        disabled = false,
        setAsDefault,
        children,
        title = "",
        size = "md",
        color = "primary",
        type = "button",
        tabIndex,
        addClass,
        onClick,
    }: ButtonProps,
) {
    return (
        <button
            type={type}
            title={title}
            default={setAsDefault}
            disabled={disabled}
            tabIndex={tabIndex}
            onClick={(e) => !disabled && onClick?.(e)}
            class={`${sizeTypes[size]} ${
                buttonColors[color]
            } transition-colors rounded-md ${addClass ?? ""}`}
        >
            {children}
        </button>
    );
}
