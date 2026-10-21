import {
    acceptCompletion,
    autocompletion,
    completionKeymap,
    type CompletionSource,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
    bracketMatching,
    indentOnInput,
    indentUnit,
} from "@codemirror/language";
import { type Compartment, type Extension, Prec } from "@codemirror/state";
import {
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightSpecialChars,
    keymap,
} from "@codemirror/view";
import { noteTextAreaHotkeys } from "@/composables/useHotkeys";
import { codeBackgrounds } from "./code-backgrounds";
import { continueListCommand, listAwareTabCommand } from "./list-continuation";
import {
    indentLeft,
    indentRight,
    insertHr,
    insertImageCommand,
    insertLinkCommand,
    toggleBold,
    toggleItalic,
} from "./markdown-commands";
import { noteEditorStyling } from "./theme";

type HotkeyIdentifier = (typeof noteTextAreaHotkeys)[number]["identifier"];

const hotkeyCommands: Record<HotkeyIdentifier, (view: EditorView) => boolean> =
    {
        boldText: toggleBold,
        italicText: toggleItalic,
        insertLink: insertLinkCommand,
        insertImage: insertImageCommand,
        insertHorizontalRule: insertHr,
        indentRight,
        indentLeft,
    };

const metaKeyNames = { ctrl: "Ctrl", alt: "Alt", shift: "Shift" } as const;

// CodeMirror key names put modifiers in Ctrl-Alt-Shift order.
const hotkeyKeymap = noteTextAreaHotkeys.map((item) => ({
    key: [
        ...(["ctrl", "alt", "shift"] as const)
            .filter((meta) =>
                (item.metaKeys as readonly string[]).includes(meta),
            )
            .map((meta) => metaKeyNames[meta]),
        item.key,
    ].join("-"),
    run: hotkeyCommands[item.identifier],
    preventDefault: true,
}));

export interface NoteEditorSetupOptions {
    completion: CompletionSource;
    onChange: (text: string) => void;
    onPasteFiles?: (files: File[]) => void;
    tabIndex: number;
    editableCompartment: Compartment;
    initialEditable: boolean;
}

export const createNoteEditorExtensions = ({
    completion,
    onChange,
    onPasteFiles,
    tabIndex,
    editableCompartment,
    initialEditable,
}: NoteEditorSetupOptions): Extension[] => [
    history(),
    drawSelection(),
    highlightSpecialChars(),
    highlightActiveLine(),
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage, codeLanguages: [] }),
    noteEditorStyling,
    codeBackgrounds,
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
        keymap.of([{ key: "Tab", run: acceptCompletion }, ...completionKeymap]),
    ),
    Prec.high(
        keymap.of([
            { key: "Enter", run: continueListCommand },
            { key: "Tab", run: listAwareTabCommand },
            ...hotkeyKeymap,
        ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            onChange(update.state.doc.toString());
        }
    }),
    EditorView.domEventHandlers({
        paste(event) {
            const files = Array.from(event.clipboardData?.items ?? [])
                .map((item) => item.getAsFile())
                .filter((file): file is File => file !== null);
            if (!onPasteFiles || files.length === 0) {
                return false;
            }
            event.preventDefault();
            onPasteFiles(files);
            return true;
        },
    }),
    EditorView.contentAttributes.of({ tabindex: String(tabIndex) }),
    editableCompartment.of(EditorView.editable.of(initialEditable)),
];
