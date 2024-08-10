import { ComponentChildren } from "preact";

interface ButtonProps {
    disabled?: boolean;
    setAsDefault?: boolean;
    children?: ComponentChildren;
    size?: ButtonSize;
    title?: string;
    name?: string;
    color?: ButtonColors;
    type?: "button" | "submit";
    borderClass?: string;
    rounded?: boolean;
    addClass?: string;
    tabIndex?: number;
    onClick?: (event: Event) => void;
}

const buttonColors = {
    primary: "bg-gray-600 hover:bg-gray-500 border-gray-500/50 text-white",
    warning:
        "bg-yellow-700 hover:bg-yellow-600 border-yellow-600/50 text-white",
    success: "bg-sky-900 hover:bg-sky-600 border-sky-600/50 text-white",
    successDisabled: "bg-sky-600 border-sky-600/50 text-white",
    danger: "bg-red-500 hover:bg-red-600 border-red-600/50 text-white",
    transparent: "bg-transparent border-gray-700/50 hover:bg-gray-700/25",
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
        name,
        title = "",
        size = "md",
        color = "primary",
        type = "button",
        rounded = true,
        borderClass,
        tabIndex,
        addClass,
        onClick,
    }: ButtonProps,
) {
    if (!borderClass) {
        borderClass = color === "transparent" ? "border-b" : "border";
    }

    const roundedClass = rounded ? "rounded-md" : "";
    return (
        <button
            type={type}
            title={title}
            default={setAsDefault}
            disabled={disabled}
            name={name}
            tabIndex={tabIndex}
            onClick={(e) => !disabled && onClick?.(e)}
            class={`${borderClass} bg-opacity-50 hover:bg-opacity-100 border-solid ${
                sizeTypes[size]
            } ${buttonColors[color]} ${roundedClass} transition-colors ${
                addClass ?? ""
            }`}
        >
            {children}
        </button>
    );
}
