import {
    Extension,
    InputRule,
    Node,
    wrappingInputRule,
    type AnyExtension,
    type NodeViewRenderer,
} from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { TextSelection } from "@tiptap/pm/state";
import { noteHighlighter } from "./code-highlight";
import StarterKit from "@tiptap/starter-kit";
import {
    noteEditorHotkeys,
    noteTextAreaHotkeys,
    type HotkeyItem,
} from "@/composables/useHotkeys";

const dataAttribute = (name: string, attribute: string) => ({
    [name]: {
        default: "",
        parseHTML: (element: HTMLElement) =>
            element.getAttribute(attribute) ?? "",
        renderHTML: (attributes: Record<string, string>) => ({
            [attribute]: attributes[name],
        }),
    },
});

// markdown-it splits paragraph lines with soft breaks; the viewer shows them
// as spaces and saving keeps the line.
export const SoftBreak = Node.create({
    name: "softBreak",
    inline: true,
    group: "inline",
    selectable: false,
    parseHTML: () => [{ tag: "span[data-soft-break]" }],
    renderHTML: () => ["span", { "data-soft-break": "" }, " "],
    renderText: () => " ",
});

export const extensionInputPattern = /\{:[a-zA-Z0-9-]+(?:\|[^}\n]+)*\}$/;

export interface ExtensionEdit {
    name: string;
    params: string[];
    range: { from: number; to: number };
}

export interface NoteExtensionOptions {
    onEdit: ((edit: ExtensionEdit) => void) | null;
}

export const parseExtensionSource = (source: string) => {
    const [name = "", ...params] = source.slice(2, -1).split("|");
    return { name, params };
};

export const NoteExtension = Node.create<NoteExtensionOptions>({
    name: "noteExtension",
    addOptions: () => ({ onEdit: null }),
    inline: true,
    group: "inline",
    atom: true,
    draggable: true,
    addAttributes: () => dataAttribute("source", "data-note-extension"),
    parseHTML: () => [{ tag: "span[data-note-extension]" }],
    renderHTML: ({ HTMLAttributes }) => [
        "span",
        HTMLAttributes,
        HTMLAttributes["data-note-extension"] as string,
    ],
    renderText: ({ node }) => node.attrs.source as string,
    addInputRules() {
        return [
            new InputRule({
                find: extensionInputPattern,
                handler: ({ state, range, match }) => {
                    state.tr.replaceWith(
                        range.from,
                        range.to,
                        this.type.create({ source: match[0] }),
                    );
                },
            }),
        ];
    },
});

export const FootnoteReference = Node.create({
    name: "footnoteReference",
    inline: true,
    group: "inline",
    atom: true,
    addAttributes: () => dataAttribute("label", "data-footnote-ref"),
    parseHTML: () => [{ tag: "sup[data-footnote-ref]" }],
    renderHTML: ({ HTMLAttributes }) => [
        "sup",
        { ...HTMLAttributes, class: "footnote-ref" },
        `[${HTMLAttributes["data-footnote-ref"]}]`,
    ],
    renderText: ({ node }) => `[^${node.attrs.label}]`,
    addInputRules() {
        return [
            new InputRule({
                // At the start of a paragraph it opens a definition instead.
                find: /(?<=\S)\[\^([^\]\s]+)\]$/,
                handler: ({ state, range, match }) => {
                    state.tr.replaceWith(
                        range.from,
                        range.to,
                        this.type.create({ label: match[1] }),
                    );
                },
            }),
        ];
    },
});

export const FootnoteDefinition = Node.create({
    name: "footnoteDefinition",
    group: "block",
    content: "block+",
    defining: true,
    addAttributes: () => dataAttribute("label", "data-footnote-def"),
    parseHTML: () => [{ tag: "div[data-footnote-def]" }],
    renderHTML: ({ HTMLAttributes }) => [
        "div",
        { ...HTMLAttributes, class: "rich-footnote-def" },
        0,
    ],
    addInputRules() {
        return [
            wrappingInputRule({
                find: /^\[\^([^\]\s]+)\]:\s$/,
                type: this.type,
                getAttributes: (match) => ({ label: match[1] }),
            }),
        ];
    },
});

const LinkAndImageInput = Extension.create({
    name: "linkAndImageInput",
    addInputRules() {
        const { schema } = this.editor;
        return [
            new InputRule({
                find: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/,
                handler: ({ state, range, match }) => {
                    state.tr.replaceWith(
                        range.from,
                        range.to,
                        schema.nodes.image!.create({
                            alt: match[1],
                            src: match[2],
                            title: match[3] ?? null,
                        }),
                    );
                },
            }),
            new InputRule({
                find: /(?<!!)\[([^\]^][^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/,
                handler: ({ state, range, match }) => {
                    const link = schema.marks.link!.create({
                        href: match[2],
                        title: match[3] ?? null,
                    });
                    state.tr
                        .replaceWith(
                            range.from,
                            range.to,
                            schema.text(match[1]!, [link]),
                        )
                        .removeStoredMark(link);
                },
            }),
        ];
    },
});

// Tiptap starts a task list from "[ ] " in a plain paragraph; markdown
// writes it as "- [ ] ", which is a new bullet list by then.
const TaskMarkerInput = Extension.create({
    name: "taskMarkerInput",
    addInputRules() {
        return [
            new InputRule({
                find: /^\[([ xX])\]\s$/,
                handler: ({ state, range, match }) => {
                    const $from = state.doc.resolve(range.from);
                    const list = $from.node(-2);
                    if (
                        list?.type.name !== "bulletList" ||
                        list.childCount !== 1
                    ) {
                        return null;
                    }
                    const { tr, schema } = state;
                    const listPos = $from.before(-2);
                    tr.delete(range.from, range.to);
                    const item = tr.doc.nodeAt(listPos)!.firstChild!;
                    const taskList = schema.nodes.taskList!.create(
                        { markup: list.attrs.markup },
                        schema.nodes.taskItem!.create(
                            { checked: match[1] !== " " },
                            item.content,
                        ),
                    );
                    tr.replaceWith(
                        listPos,
                        listPos + list.nodeSize - (range.to - range.from),
                        taskList,
                    );
                    tr.setSelection(TextSelection.create(tr.doc, listPos + 3));
                },
            }),
        ];
    },
});

// What the markdown was written with, so saving does not rewrite it.
const MarkdownAttributes = Extension.create({
    name: "markdownAttributes",
    addGlobalAttributes: () => [
        {
            types: [
                "bold",
                "italic",
                "bulletList",
                "orderedList",
                "taskList",
                "codeBlock",
                "horizontalRule",
            ],
            attributes: { markup: { default: null, rendered: false } },
        },
        {
            types: ["bulletList", "orderedList", "taskList"],
            attributes: { tight: { default: true, rendered: false } },
        },
    ],
});

export interface ShortcutHandlers {
    openLink: () => void;
    openImage: () => void;
}

type HotkeyIdentifier = (typeof noteTextAreaHotkeys)[number]["identifier"];

const keyName = (hotkey: HotkeyItem) =>
    [
        ...hotkey.metaKeys.map(
            (meta) => meta[0]!.toUpperCase() + meta.slice(1),
        ),
        hotkey.key,
    ].join("-");

// The source editor's shortcuts, which name Ctrl on every platform. The
// note editor's own ones (save, preview) pass through, so Tiptap's Mod-e
// for inline code is taken out of their way.
const NoteShortcuts = Extension.create<ShortcutHandlers>({
    name: "noteShortcuts",
    priority: 1000,
    addOptions: () => ({ openLink: () => {}, openImage: () => {} }),
    addKeyboardShortcuts() {
        const { editor, options } = this;
        const listItem = () =>
            editor.isActive("taskItem") ? "taskItem" : "listItem";
        const done = (command: () => unknown) => () => {
            command();
            return true;
        };
        const commands: Record<HotkeyIdentifier, () => boolean> = {
            boldText: () => editor.commands.toggleBold(),
            italicText: () => editor.commands.toggleItalic(),
            insertLink: done(options.openLink),
            insertImage: done(options.openImage),
            insertHorizontalRule: () => editor.commands.setHorizontalRule(),
            indentRight: done(() => editor.commands.sinkListItem(listItem())),
            indentLeft: done(() => editor.commands.liftListItem(listItem())),
        };
        return {
            "Mod-e": () => true,
            ...Object.fromEntries(
                noteEditorHotkeys.map((hotkey) => [
                    keyName(hotkey),
                    () => true,
                ]),
            ),
            ...Object.fromEntries(
                noteTextAreaHotkeys.map((hotkey) => [
                    keyName(hotkey),
                    commands[hotkey.identifier],
                ]),
            ),
        };
    },
});

export interface RichEditorOptions {
    shortcuts?: ShortcutHandlers;
    onEditExtension?: NoteExtensionOptions["onEdit"];
    codeBlockView?: NodeViewRenderer;
    extensionView?: NodeViewRenderer;
}

export const createRichEditorExtensions = ({
    shortcuts,
    onEditExtension = null,
    codeBlockView,
    extensionView,
}: RichEditorOptions = {}): AnyExtension[] => [
    StarterKit.configure({
        codeBlock: false,
        underline: false,
        link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { target: null },
        },
    }),
    (codeBlockView
        ? CodeBlockLowlight.extend({ addNodeView: () => codeBlockView })
        : CodeBlockLowlight
    ).configure({ lowlight: noteHighlighter }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({ inline: true }),
    SoftBreak,
    (extensionView
        ? NoteExtension.extend({ addNodeView: () => extensionView })
        : NoteExtension
    ).configure({
        onEdit: onEditExtension,
    }),
    FootnoteReference,
    FootnoteDefinition,
    LinkAndImageInput,
    TaskMarkerInput,
    MarkdownAttributes,
    NoteShortcuts.configure(shortcuts),
];
