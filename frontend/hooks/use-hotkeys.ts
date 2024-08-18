import { noteTextAreaHotkeySet } from "$islands/notes/NoteTextArea.tsx";
import { insertDialogHotkeySet } from "$islands/notes/InsertDialog.tsx";
import { noteEditorHotkeySet } from "$islands/notes/NoteEditor.tsx";
import { useMemo } from "preact/hooks";

type HotkeySets =
    | typeof noteTextAreaHotkeySet
    | typeof insertDialogHotkeySet
    | typeof noteEditorHotkeySet;

export type HotkeyMap = {
    [K in HotkeySets["context"]]: Extract<HotkeySets, { context: K }>["items"];
};

export const getHotkeyMap: () => HotkeyMap = () =>
    ({
        noteTextArea: noteTextAreaHotkeySet.items,
        insertDialog: insertDialogHotkeySet.items,
        noteEditor: noteEditorHotkeySet.items,
    }) as const;

export const useHotkeys = <T extends HotkeySets["context"]>(context: T) => {
    const hotkeySetItems = useMemo(() => getHotkeyMap()[context], [context]);

    const resolveHotkey = (
        event: KeyboardEvent,
    ): HotkeyMap[T][number]["identifier"] | null => {
        for (const hotkeyItem of hotkeySetItems) {
            if (event.key !== hotkeyItem.key) {
                continue;
            }

            let allMetaKeysPressed = true;
            for (const metaKey of hotkeyItem.metaKeys) {
                if (metaKey === "ctrl" && !event.ctrlKey) {
                    allMetaKeysPressed = false;
                    break;
                }

                if (metaKey === "alt" && !event.altKey) {
                    allMetaKeysPressed = false;
                    break;
                }

                if (metaKey === "shift" && !event.shiftKey) {
                    allMetaKeysPressed = false;
                    break;
                }
            }

            if (allMetaKeysPressed) {
                event.preventDefault();
                return hotkeyItem.identifier;
            }
        }

        return null;
    };

    return {
        resolveHotkey,
    };
};
