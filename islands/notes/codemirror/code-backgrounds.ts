import {
    Decoration,
    type DecorationSet,
    EditorView,
    syntaxTree,
    ViewPlugin,
    type ViewUpdate,
} from "$frontend/deps.ts";

const fencedCodeLine = Decoration.line({ class: "cm-code-block-line" });
const inlineCode = Decoration.mark({ class: "cm-inline-code" });

const buildDecorations = (view: EditorView): DecorationSet => {
    const decorations: { from: number; to: number; deco: Decoration }[] = [];

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
                if (
                    node.name === "FencedCode" || node.name === "CodeBlock"
                ) {
                    const startLine = view.state.doc.lineAt(node.from).number;
                    const endLine = view.state.doc.lineAt(node.to).number;
                    for (let i = startLine; i <= endLine; i++) {
                        const line = view.state.doc.line(i);
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            deco: fencedCodeLine,
                        });
                    }
                    return false;
                }
                if (node.name === "InlineCode") {
                    decorations.push({
                        from: node.from,
                        to: node.to,
                        deco: inlineCode,
                    });
                }
            },
        });
    }

    return Decoration.set(
        decorations.map((d) => d.deco.range(d.from, d.to)),
        true,
    );
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
    {
        decorations: (v) => v.decorations,
    },
);
