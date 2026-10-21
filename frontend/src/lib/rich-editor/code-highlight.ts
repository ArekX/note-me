import hljs from "highlight.js";

interface HighlightNode {
    value?: string;
    properties?: { className: string[] };
    children?: HighlightNode[];
}

// The viewer highlights by the first word of the info string.
const languageOf = (info: string) => info.trim().split(/\s+/)[0] ?? "";

const toNodes = (parent: Node): HighlightNode[] =>
    Array.from(parent.childNodes).map((node) =>
        node instanceof HTMLElement
            ? {
                  properties: { className: Array.from(node.classList) },
                  children: toNodes(node),
              }
            : { value: node.textContent ?? "" },
    );

// Tiptap's lowlight plugin only needs these calls, so it is given the
// highlight.js the viewer already loads instead of lowlight's second copy of
// every grammar. Blocks without a known language stay plain, as in the
// viewer, where lowlight would guess one.
export const noteHighlighter = {
    listLanguages: () => hljs.listLanguages(),
    registered: (info: string) => !!hljs.getLanguage(languageOf(info)),
    highlight: (info: string, code: string) => {
        // highlight.js escapes the code; the template is never rendered.
        const template = document.createElement("template");
        template.innerHTML = hljs.highlight(code, {
            language: languageOf(info),
        }).value;
        return { children: toNodes(template.content) };
    },
    highlightAuto: () => ({ children: [] }),
};
