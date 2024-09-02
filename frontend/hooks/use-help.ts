import { signal } from "@preact/signals";
import { NoteHelpAction } from "$islands/help/HelpWindow.tsx";

const isOpen = signal(false);
const initialAction = signal<NoteHelpAction | null>(null);

export const useHelp = () => {
    const open = (initialActionToPerform?: NoteHelpAction) => {
        initialAction.value = initialActionToPerform
            ? initialActionToPerform
            : null;
        isOpen.value = true;
    };

    const close = () => {
        isOpen.value = false;
        initialAction.value = null;
    };

    return {
        isOpen,
        initialAction,
        open,
        close,
    };
};
