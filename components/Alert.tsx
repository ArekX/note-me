import { JSX } from "preact";

interface AlertProps {
  message: string;
}

export function Alert(
  props: JSX.HTMLAttributes<Element> & AlertProps,
) {
  return props.message
    ? (
      <div class="p-5 bg-red-300 border-s-red-50 rounded-lg mb-5">
        {props.message}
      </div>
    )
    : null;
}
