import { ComponentChildren } from "preact";

export default function NoteLayout(props: { children: ComponentChildren }) {
    return (
        <div className="text-white pb-4 pt-4 pr-6 pl-6">
            {props.children}
        </div>
    );
}
