import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { getImageMarkdown, getLinkMarkdown } from "@/lib/markdown-snippets";
import { tabIndent } from "./list-continuation";

const linkStartRegex = /\s*(\w+:\/\/|\/file\/)/;

const replaceSelection = (view: EditorView, insert: string, cursor: number) => {
    const { main } = view.state.selection;
    view.dispatch({
        changes: { from: main.from, to: main.to, insert },
        selection: EditorSelection.cursor(main.from + cursor),
        userEvent: "input",
    });
    return true;
};

const wrapSelection = (view: EditorView, before: string, after: string) => {
    const { main } = view.state.selection;
    const selected = view.state.sliceDoc(main.from, main.to);
    view.dispatch({
        changes: {
            from: main.from,
            to: main.to,
            insert: `${before}${selected}${after}`,
        },
        selection: EditorSelection.range(
            main.from + before.length,
            main.from + before.length + selected.length,
        ),
        userEvent: "input",
    });
    return true;
};

export const toggleBold = (view: EditorView) => wrapSelection(view, "**", "**");

export const toggleItalic = (view: EditorView) => wrapSelection(view, "*", "*");

export const toggleInlineCode = (view: EditorView) =>
    wrapSelection(view, "`", "`");

// Adds the prefix to every selected line, or removes it when all of them
// already start with it.
export const toggleLinePrefix = (view: EditorView, prefix: string) => {
    const { state } = view;
    const { main } = state.selection;
    const lines = [];
    for (
        let pos = main.from;
        pos <= main.to;
        pos = state.doc.lineAt(pos).to + 1
    ) {
        lines.push(state.doc.lineAt(pos));
        if (pos > state.doc.length - 1) {
            break;
        }
    }
    const remove = lines.every((line) => line.text.startsWith(prefix));
    view.dispatch({
        changes: lines.map((line) =>
            remove
                ? { from: line.from, to: line.from + prefix.length }
                : { from: line.from, insert: prefix },
        ),
        userEvent: "input",
    });
    return true;
};

export const insertHr = (view: EditorView) =>
    replaceSelection(view, "\n---\n", "\n---\n".length);

const urlPlaceholder = "https://";

// A selected URL becomes the target and other selected text the label;
// whichever part is still a placeholder is selected so typing replaces it.
const insertLinkLike = (
    view: EditorView,
    format: (url: string, text: string) => string,
    prefix: string,
    textPlaceholder: string,
) => {
    const { main } = view.state.selection;
    const selected = view.state.sliceDoc(main.from, main.to).trim();
    const isUrl = linkStartRegex.test(selected);
    const text = selected && !isUrl ? selected : textPlaceholder;
    const url = isUrl ? selected : urlPlaceholder;

    const textFrom = main.from + prefix.length;
    const [from, to] =
        text === textPlaceholder
            ? [textFrom, textFrom + text.length]
            : [
                  textFrom + text.length + 2,
                  textFrom + text.length + 2 + url.length,
              ];
    view.dispatch({
        changes: { from: main.from, to: main.to, insert: format(url, text) },
        selection: EditorSelection.range(from, to),
        userEvent: "input",
    });
    return true;
};

export const insertLinkCommand = (view: EditorView) =>
    insertLinkLike(view, getLinkMarkdown, "[", "Link text");

export const insertImageCommand = (view: EditorView) =>
    insertLinkLike(view, getImageMarkdown, "![", "Image description");

const headingPrefix = /^#{1,6} /;

// Sets the heading level of every selected line; a line that already has
// this level goes back to a paragraph.
export const setHeading = (view: EditorView, level: number) => {
    const { state } = view;
    const { main } = state.selection;
    const prefix = `${"#".repeat(level)} `;
    const first = state.doc.lineAt(main.from).number;
    const last = state.doc.lineAt(main.to).number;
    const lines = Array.from({ length: last - first + 1 }, (_, index) =>
        state.doc.line(first + index),
    );
    const remove = lines.every((line) => line.text.startsWith(prefix));
    view.dispatch({
        changes: lines.map((line) => {
            const existing = headingPrefix.exec(line.text)?.[0] ?? "";
            return {
                from: line.from,
                to: line.from + existing.length,
                insert: remove ? "" : prefix,
            };
        }),
        userEvent: "input",
    });
    return true;
};

// Fences the selected lines, or opens an empty block with the cursor inside.
export const insertCodeBlock = (view: EditorView) => {
    const { main } = view.state.selection;
    const line = view.state.doc.lineAt(main.from);
    const open = `${main.from > line.from ? "\n" : ""}\`\`\`\n`;
    const selected = view.state.sliceDoc(main.from, main.to);
    view.dispatch({
        changes: {
            from: main.from,
            to: main.to,
            insert: `${open}${selected}\n\`\`\``,
        },
        selection: EditorSelection.cursor(
            main.from + open.length + selected.length,
        ),
        userEvent: "input",
    });
    return true;
};

export const insertText = (view: EditorView, text: string) =>
    replaceSelection(view, text, text.length);

export const indentRight = (view: EditorView): boolean => {
    const { main } = view.state.selection;
    const line = view.state.doc.lineAt(main.from);
    view.dispatch({
        changes: { from: line.from, insert: tabIndent },
        selection: EditorSelection.range(
            main.from + tabIndent.length,
            main.to + tabIndent.length,
        ),
        userEvent: "input.indent",
    });
    return true;
};

export const indentLeft = (view: EditorView): boolean => {
    const { main } = view.state.selection;
    const line = view.state.doc.lineAt(main.from);

    let removeCount = 0;
    while (removeCount < tabIndent.length && line.text[removeCount] === " ") {
        removeCount++;
    }
    if (removeCount === 0) {
        return true;
    }

    view.dispatch({
        changes: { from: line.from, to: line.from + removeCount, insert: "" },
        selection: EditorSelection.range(
            Math.max(line.from, main.from - removeCount),
            Math.max(line.from, main.to - removeCount),
        ),
        userEvent: "delete.dedent",
    });
    return true;
};
