import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

const listItemRegex = /^(\s*)(-|\*|\d+\.)(\s+)(\[[x ]\]\s)?/;
const emptyListRegex = /^(\s*)(-|\*|\d+\.)(\s+)(\[[x ]\]\s)?$/;
export const tabIndent = "    ";

const nextListChar = (listChar: string): string => {
    const numberMatch = listChar.match(/^(\d+)\.$/);
    return numberMatch ? `${parseInt(numberMatch[1]!) + 1}.` : listChar;
};

export const continueListCommand = (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    if (state.readOnly || main.from !== main.to) {
        return false;
    }

    const line = state.doc.lineAt(main.from);
    const match = line.text.match(listItemRegex);
    if (!match) {
        return false;
    }

    if (emptyListRegex.test(line.text)) {
        view.dispatch({
            changes: { from: line.from, to: line.to, insert: "" },
            selection: EditorSelection.cursor(line.from),
            userEvent: "delete.list",
        });
        return true;
    }

    const [, indent, listChar, , checkbox] = match;
    const insert = `\n${indent}${nextListChar(listChar!)} ${checkbox ? "[ ] " : ""}`;

    view.dispatch({
        changes: { from: main.from, insert },
        selection: EditorSelection.cursor(main.from + insert.length),
        userEvent: "input.list",
    });
    return true;
};

export const listAwareTabCommand = (view: EditorView): boolean => {
    const { state } = view;
    if (state.readOnly) {
        return false;
    }
    const { main } = state.selection;
    const line = state.doc.lineAt(main.from);

    if (listItemRegex.test(line.text)) {
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
