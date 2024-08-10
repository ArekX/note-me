import { JSX } from "preact";

interface AlertProps {
    message: string;
}

export default function Alert(
    props: JSX.HTMLAttributes<Element> & AlertProps,
) {
    return props.message
        ? (
            <div class="p-5 bg-red-600/50 border-red-600/50 border shadow-md rounded-lg mb-5">
                {props.message}
            </div>
        )
        : null;
}
