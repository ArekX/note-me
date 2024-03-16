import { ComponentChildren } from "preact";

interface PanelProps {
    children: ComponentChildren;
}

export function Panel(
    props: PanelProps,
) {
    return (
        <div class="rounded-lg bg-gray-200 shadow-md m-5 p-5">
            {props.children}
        </div>
    );
}
