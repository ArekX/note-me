type HotkeyContext = "global" | "editor" | "noteTextArea";

type MetaKey = "ctrl" | "alt" | "shift";

interface HotkeyItem<T extends string = string> {
    identifier: T;
    metaKeys: MetaKey[];
    key: string;
    description: string;
}

export interface HotkeySet<T extends string, ItemTypes extends string> {
    context: T;
    items: HotkeyItem<ItemTypes>[];
}
