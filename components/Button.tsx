import { ComponentChildren, JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface ButtonProps {
  disabled?: boolean;
  setAsDefault?: boolean;
  children?: ComponentChildren;
  color?: ButtonColors;
  onClick?: () => void;
};

const buttonColors = {
  primary: "bg-gray-500 hover:bg-gray-600 text-white",
  danger: "bg-red-500 hover:bg-red-600 text-white",
};

export type ButtonColors = keyof typeof buttonColors;

export function Button({ disabled, setAsDefault, children, color = "primary", onClick }: ButtonProps) {
  return (
    <button
      default={setAsDefault}
      disabled={!IS_BROWSER || disabled}
      onClick={onClick}
      class={`px-3 py-2 ${buttonColors[color]} transition-colors`}
    >{children}</button>
  );
}
