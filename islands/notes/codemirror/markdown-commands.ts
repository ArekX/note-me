import { EditorSelection, EditorView } from "$frontend/deps.ts";
import {
    getImageMarkdown,
    getLinkMarkdown,
} from "$islands/notes/helpers/markdown.ts";

const tabIndent = "    ";
const linkStartRegex = /\s*(\w+:\/\/|\/file\/)/;

const wrapSelection = (
    view: EditorView,
    before: string,
    after: string,
): boolean => {
    const { state } = view;
    const { main } = state.selection;
    const selected = state.sliceDoc(main.from, main.to);
    const insert = `${before}${selected}${after}`;
    view.dispatch({
        changes: { from: main.from, to: main.to, insert },
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

export const insertHr = (view: EditorView): boolean => {
    const { main } = view.state.selection;
    const insert = "\n---\n";
    view.dispatch({
        changes: { from: main.from, to: main.to, insert },
        selection: EditorSelection.cursor(main.from + insert.length),
        userEvent: "input",
    });
    return true;
};

export const insertLinkCommand = (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    const selected = state.sliceDoc(main.from, main.to);

    if (!selected) {
        const insert = getLinkMarkdown("", "");
        view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: EditorSelection.cursor(main.from + insert.length),
            userEvent: "input",
        });
        return true;
    }

    if (linkStartRegex.test(selected)) {
        const insert = getLinkMarkdown(selected.trim(), "");
        view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: EditorSelection.cursor(main.from + 1),
            userEvent: "input",
        });
        return true;
    }

    const insert = getLinkMarkdown("", selected);
    view.dispatch({
        changes: { from: main.from, to: main.to, insert },
        selection: EditorSelection.cursor(
            main.from + selected.length + 3,
        ),
        userEvent: "input",
    });
    return true;
};

export const insertImageCommand = (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    const selected = state.sliceDoc(main.from, main.to);

    if (!selected) {
        const insert = getImageMarkdown("", "");
        view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: EditorSelection.cursor(main.from + insert.length),
            userEvent: "input",
        });
        return true;
    }

    if (linkStartRegex.test(selected)) {
        const insert = getImageMarkdown(selected.trim(), "");
        view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: EditorSelection.cursor(main.from + 2),
            userEvent: "input",
        });
        return true;
    }

    const insert = getImageMarkdown("", selected);
    view.dispatch({
        changes: { from: main.from, to: main.to, insert },
        selection: EditorSelection.cursor(
            main.from + selected.length + 4,
        ),
        userEvent: "input",
    });
    return true;
};

export const indentRight = (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    const line = state.doc.lineAt(main.from);
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
    const { state } = view;
    const { main } = state.selection;
    const line = state.doc.lineAt(main.from);

    let removeCount = 0;
    while (
        removeCount < tabIndent.length && line.text[removeCount] === " "
    ) {
        removeCount++;
    }
    if (removeCount === 0) return true;

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
