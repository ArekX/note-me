import {
    acceptCompletion,
    autocompletion,
    bracketMatching,
    Compartment,
    completionKeymap,
    type CompletionSource,
    defaultKeymap,
    drawSelection,
    EditorView,
    type Extension,
    highlightActiveLine,
    highlightSpecialChars,
    history,
    historyKeymap,
    indentOnInput,
    indentUnit,
    keymap,
    markdown,
    markdownLanguage,
    Prec,
} from "$frontend/deps.ts";
import { HotkeySet } from "$frontend/hotkeys.ts";
import {
    continueListCommand,
    listAwareTabCommand,
} from "./list-continuation.ts";
import {
    indentLeft,
    indentRight,
    insertHr,
    insertImageCommand,
    insertLinkCommand,
    toggleBold,
    toggleItalic,
} from "./markdown-commands.ts";
import { noteEditorStyling } from "./theme.ts";

type HotkeyCommand = (view: EditorView) => boolean;

const hotkeyCommands: Record<string, HotkeyCommand> = {
    boldText: toggleBold,
    italicText: toggleItalic,
    insertLink: insertLinkCommand,
    insertImage: insertImageCommand,
    insertHorizontalRule: insertHr,
    indentRight,
    indentLeft,
};

const buildHotkeyKey = (
    metaKeys: ReadonlyArray<"ctrl" | "alt" | "shift">,
    key: string,
): string => {
    const parts: string[] = [];
    if (metaKeys.includes("ctrl")) parts.push("Ctrl");
    if (metaKeys.includes("alt")) parts.push("Alt");
    if (metaKeys.includes("shift")) parts.push("Shift");
    parts.push(key);
    return parts.join("-");
};

const buildHotkeyKeymap = <T extends string, K extends string>(
    set: HotkeySet<T, K>,
) => set.items
    .filter((item) => hotkeyCommands[item.identifier])
    .map((item) => ({
        key: buildHotkeyKey(item.metaKeys, item.key),
        run: hotkeyCommands[item.identifier],
        preventDefault: true,
    }));

export interface NoteEditorSetupOptions {
    hotkeySet: HotkeySet<string, string>;
    completion: CompletionSource;
    onChange: (text: string) => void;
    onPasteFiles: (files: File[]) => void;
    tabIndex: number;
    editableCompartment: Compartment;
    initialEditable: boolean;
}

export const createNoteEditorExtensions = ({
    hotkeySet,
    completion,
    onChange,
    onPasteFiles,
    tabIndex,
    editableCompartment,
    initialEditable,
}: NoteEditorSetupOptions): Extension[] => {
    return [
        history(),
        drawSelection(),
        highlightSpecialChars(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        markdown({ base: markdownLanguage, codeLanguages: [] }),
        noteEditorStyling,
        indentUnit.of("    "),
        indentOnInput(),
        bracketMatching(),
        autocompletion({
            override: [completion],
            activateOnTyping: true,
            closeOnBlur: true,
            icons: false,
        }),
        Prec.highest(
            keymap.of([
                { key: "Tab", run: acceptCompletion },
                ...completionKeymap,
            ]),
        ),
        Prec.high(
            keymap.of([
                { key: "Enter", run: continueListCommand },
                { key: "Tab", run: listAwareTabCommand },
                ...buildHotkeyKeymap(hotkeySet),
            ]),
        ),
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onChange(update.state.doc.toString());
            }
        }),
        EditorView.domEventHandlers({
            paste(event, _view) {
                if (!event.clipboardData) return false;
                const files: File[] = [];
                for (
                    const item of Array.from(event.clipboardData.items)
                ) {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
                if (files.length === 0) return false;
                event.preventDefault();
                onPasteFiles(files);
                return true;
            },
        }),
        EditorView.contentAttributes.of({ tabindex: String(tabIndex) }),
        editableCompartment.of(EditorView.editable.of(initialEditable)),
    ];
};
