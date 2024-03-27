import { ComponentChildren } from "preact";

interface ButtonProps {
    disabled?: boolean;
    setAsDefault?: boolean;
    children?: ComponentChildren;
    size?: ButtonSize;
    title?: string;
    color?: ButtonColors;
    type?: "button" | "submit";
    tabIndex?: number;
    onClick?: () => void;
}

const buttonColors = {
    primary: "bg-gray-500 hover:bg-gray-600 text-white",
    success: "bg-sky-900 hover:bg-sky-600 text-white",
    successDisabled: "bg-sky-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
};

const sizeTypes = {
    "xs": "px-2 py-1 text-xs",
    "sm": "px-4 py-1",
    "md": "px-6 py-2",
};

export type ButtonColors = keyof typeof buttonColors;

export type ButtonSize = keyof typeof sizeTypes;

export function Button(
    {
        disabled = false,
        setAsDefault,
        children,
        title = "",
        size = "md",
        color = "primary",
        type = "button",
        tabIndex,
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
            onClick={onClick}
            class={`${sizeTypes[size]} ${
                buttonColors[color]
            } transition-colors rounded-md`}
        >
            {children}
        </button>
    );
}
