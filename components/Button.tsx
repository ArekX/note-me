import { ComponentChildren, JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface ButtonProps {
    disabled?: boolean;
    setAsDefault?: boolean;
    children?: ComponentChildren;
    color?: ButtonColors;
    type?: "button" | "submit";
    onClick?: () => void;
}

const buttonColors = {
    primary: "bg-gray-500 hover:bg-gray-600 text-white",
    success: "bg-sky-900 hover:bg-sky-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
};

export type ButtonColors = keyof typeof buttonColors;

export function Button(
    {
        disabled = false,
        setAsDefault,
        children,
        color = "primary",
        type = "button",
        onClick,
    }: ButtonProps,
) {
    return (
        <button
            type={type}
            default={setAsDefault}
            disabled={disabled}
            onClick={onClick}
            class={`px-6 py-2 ${
                buttonColors[color]
            } transition-colors rounded-md`}
        >
            {children}
        </button>
    );
}
