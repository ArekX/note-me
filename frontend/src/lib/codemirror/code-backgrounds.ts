import type { Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import {
    Decoration,
    type DecorationSet,
    type EditorView,
    ViewPlugin,
    type ViewUpdate,
} from "@codemirror/view";

const fencedCodeLine = Decoration.line({ class: "cm-code-block-line" });
const inlineCode = Decoration.mark({ class: "cm-inline-code" });

const buildDecorations = (view: EditorView): DecorationSet => {
    const decorations: Range<Decoration>[] = [];
    const { doc } = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
                if (node.name === "FencedCode" || node.name === "CodeBlock") {
                    const endLine = doc.lineAt(node.to).number;
                    for (
                        let i = doc.lineAt(node.from).number;
                        i <= endLine;
                        i++
                    ) {
                        decorations.push(
                            fencedCodeLine.range(doc.line(i).from),
                        );
                    }
                    return false;
                }
                if (node.name === "InlineCode") {
                    decorations.push(inlineCode.range(node.from, node.to));
                }
            },
        });
    }

    return Decoration.set(decorations, true);
};

export const codeBackgrounds = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (
                update.docChanged ||
                update.viewportChanged ||
                syntaxTree(update.startState) !== syntaxTree(update.state)
            ) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    { decorations: (plugin) => plugin.decorations },
);
