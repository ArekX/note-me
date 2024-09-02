import { ComponentChildren } from "preact";
import { useHelp } from "$frontend/hooks/use-help.ts";
import { NoteHelpAction } from "$islands/help/HelpWindow.tsx";

interface HelpActionProps {
    children: ComponentChildren;
    action?: NoteHelpAction;
    disableUnderline?: boolean;
    onOpened?: () => void;
}

export default function HelpAction(
    { children, action, disableUnderline, onOpened }: HelpActionProps,
) {
    const help = useHelp();

    return (
        <span
            class={`cursor-pointer ${disableUnderline ? "" : "underline"}`}
            onClick={() => {
                help.open(action);
                onOpened?.();
            }}
        >
            {children}
        </span>
    );
}
