import { onBeforeUnmount, onMounted } from "vue";

type MetaKey = "ctrl" | "alt" | "shift";

export interface HotkeyItem<T extends string = string> {
    identifier: T;
    metaKeys: MetaKey[];
    key: string;
    description: string;
}

export const noteEditorHotkeys = [
    {
        identifier: "save",
        key: "s",
        metaKeys: ["ctrl"],
        description: "Save note changes",
    },
    {
        identifier: "togglePreview",
        key: "e",
        metaKeys: ["ctrl"],
        description: "Toggle between preview / editor mode",
    },
] as const satisfies HotkeyItem[];

export const noteTextAreaHotkeys = [
    {
        identifier: "boldText",
        metaKeys: ["ctrl"],
        key: "b",
        description: "Make text bold",
    },
    {
        identifier: "italicText",
        metaKeys: ["ctrl"],
        key: "i",
        description: "Make text italic",
    },
    {
        identifier: "insertLink",
        metaKeys: ["ctrl"],
        key: "k",
        description:
            "Insert link template. If selected text is a URL, it will be used as the link target otherwise it will be used as the link text",
    },
    {
        identifier: "insertImage",
        metaKeys: ["ctrl"],
        key: "p",
        description:
            "Insert image template. If selected text is a URL, it will be used as the image source otherwise it will be used as the image alt text",
    },
    {
        identifier: "insertHorizontalRule",
        metaKeys: ["ctrl"],
        key: "h",
        description: "Insert horizontal rule",
    },
    {
        identifier: "indentRight",
        metaKeys: ["ctrl"],
        key: "]",
        description: "Indent right",
    },
    {
        identifier: "indentLeft",
        metaKeys: ["ctrl"],
        key: "[",
        description: "Indent left",
    },
] as const satisfies HotkeyItem[];

export const hotkeyMap = {
    noteEditor: noteEditorHotkeys,
    noteTextArea: noteTextAreaHotkeys,
};

type HotkeyContext = keyof typeof hotkeyMap;
type HotkeyIdentifier<C extends HotkeyContext> =
    (typeof hotkeyMap)[C][number]["identifier"];

const metaKeyPressed: Record<MetaKey, (event: KeyboardEvent) => boolean> = {
    ctrl: (event) => event.ctrlKey,
    alt: (event) => event.altKey,
    shift: (event) => event.shiftKey,
};

export const resolveHotkey = <C extends HotkeyContext>(
    context: C,
    event: KeyboardEvent,
): HotkeyIdentifier<C> | null => {
    const items: readonly HotkeyItem<HotkeyIdentifier<C>>[] =
        hotkeyMap[context];
    const match = items.find(
        (item) =>
            event.key === item.key &&
            item.metaKeys.every((metaKey) => metaKeyPressed[metaKey](event)),
    );
    if (!match) {
        return null;
    }
    event.preventDefault();
    return match.identifier;
};

export const useHotkeys = <C extends HotkeyContext>(
    context: C,
    handlers: Partial<Record<HotkeyIdentifier<C>, () => void>>,
) => {
    const handleKeydown = (event: KeyboardEvent) => {
        const hotkey = resolveHotkey(context, event);
        if (hotkey) {
            handlers[hotkey]?.();
        }
    };

    onMounted(() => document.addEventListener("keydown", handleKeydown));
    onBeforeUnmount(() =>
        document.removeEventListener("keydown", handleKeydown),
    );
};
