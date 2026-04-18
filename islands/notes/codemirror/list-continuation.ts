import { EditorSelection, EditorView } from "$frontend/deps.ts";

const listItemRegex = /^(\s*)(-|\*|\d+\.)(\s+)(\[[x ]\]\s)?/;
const emptyListRegex = /^(\s*)(-|\*|\d+\.)(\s+)(\[[x ]\]\s)?$/;
const tabIndent = "    ";

interface ListMatch {
    indent: string;
    listChar: string;
    space: string;
    checkbox: string | undefined;
}

const parseListLine = (lineText: string): ListMatch | null => {
    const m = lineText.match(listItemRegex);
    if (!m) return null;
    return {
        indent: m[1],
        listChar: m[2],
        space: m[3],
        checkbox: m[4],
    };
};

const nextListChar = (listChar: string): string => {
    const numberMatch = listChar.match(/^(\d+)\.$/);
    if (numberMatch) {
        return `${parseInt(numberMatch[1]) + 1}.`;
    }
    return listChar;
};

export const continueListCommand = (view: EditorView): boolean => {
    const { state } = view;
    if (state.readOnly) return false;
    const { main } = state.selection;
    if (main.from !== main.to) return false;

    const line = state.doc.lineAt(main.from);
    const parsed = parseListLine(line.text);
    if (!parsed) return false;

    if (emptyListRegex.test(line.text)) {
        view.dispatch({
            changes: { from: line.from, to: line.to, insert: "" },
            selection: EditorSelection.cursor(line.from),
            userEvent: "delete.list",
        });
        return true;
    }

    const { indent, listChar, checkbox } = parsed;
    const checkboxPart = checkbox ? "[ ] " : "";
    const insert = `\n${indent}${nextListChar(listChar)} ${checkboxPart}`;

    view.dispatch({
        changes: { from: main.from, insert },
        selection: EditorSelection.cursor(main.from + insert.length),
        userEvent: "input.list",
    });
    return true;
};

export const listAwareTabCommand = (view: EditorView): boolean => {
    const { state } = view;
    if (state.readOnly) return false;
    const { main } = state.selection;

    const line = state.doc.lineAt(main.from);
    const parsed = parseListLine(line.text);

    if (parsed) {
        view.dispatch({
            changes: { from: line.from, insert: tabIndent },
            selection: EditorSelection.range(
                main.from + tabIndent.length,
                main.to + tabIndent.length,
            ),
            userEvent: "input.indent",
        });
        return true;
    }

    view.dispatch(
        state.update(state.replaceSelection(tabIndent), {
            userEvent: "input.indent",
        }),
    );
    return true;
};
