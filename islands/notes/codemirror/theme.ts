import {
    EditorView,
    HighlightStyle,
    highlightTags as t,
    syntaxHighlighting,
} from "$frontend/deps.ts";

const markdownHighlight = HighlightStyle.define([
    { tag: t.heading1, fontSize: "1.6em", fontWeight: "700", color: "#fff" },
    { tag: t.heading2, fontSize: "1.4em", fontWeight: "700", color: "#fff" },
    { tag: t.heading3, fontSize: "1.2em", fontWeight: "600", color: "#fff" },
    { tag: t.heading4, fontSize: "1.1em", fontWeight: "600", color: "#fff" },
    { tag: t.heading5, fontWeight: "600", color: "#fff" },
    { tag: t.heading6, fontWeight: "600", color: "#d1d5db" },
    { tag: t.strong, fontWeight: "700", color: "#fff" },
    { tag: t.emphasis, fontStyle: "italic", color: "#e5e7eb" },
    { tag: t.strikethrough, textDecoration: "line-through", color: "#9ca3af" },
    { tag: t.link, color: "#60a5fa" },
    { tag: t.url, color: "#93c5fd", textDecoration: "underline" },
    { tag: t.monospace, color: "#86efac" },
    { tag: t.quote, color: "#a5b4fc", fontStyle: "italic" },
    { tag: t.list, color: "#fcd34d" },
    { tag: t.meta, color: "#9ca3af" },
    { tag: t.processingInstruction, color: "#9ca3af" },
    { tag: t.keyword, color: "#f472b6" },
    { tag: t.contentSeparator, color: "#6b7280" },
]);

const noteEditorTheme = EditorView.theme(
    {
        "&": {
            color: "#fff",
            backgroundColor: "transparent",
            fontSize: "14px",
        },
        "&.cm-focused": {
            outline: "none",
        },
        ".cm-scroller": {
            fontFamily: "monospace",
            lineHeight: "1.5",
            overflow: "visible",
        },
        ".cm-content": {
            caretColor: "#fff",
            padding: "4px 0",
        },
        ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "#fff",
        },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
            {
                backgroundColor: "#3b5268",
            },
        ".cm-activeLine": {
            backgroundColor: "rgba(255, 255, 255, 0.03)",
        },
        ".cm-line": {
            padding: "0 4px",
        },
        ".cm-code-block-line": {
            backgroundColor: "rgba(134, 239, 172, 0.08)",
        },
        ".cm-inline-code": {
            backgroundColor: "rgba(134, 239, 172, 0.08)",
            borderRadius: "3px",
        },
        ".cm-tooltip": {
            backgroundColor: "#1f2937",
            border: "1px solid rgba(75, 85, 99, 0.5)",
            color: "#fff",
        },
        ".cm-tooltip-autocomplete": {
            borderRadius: "6px",
            maxHeight: "14em",
        },
        ".cm-tooltip-autocomplete > ul": {
            fontFamily: "inherit",
            maxWidth: "30em",
        },
        ".cm-tooltip-autocomplete > ul > li": {
            padding: "4px 10px",
            lineHeight: "1.4",
        },
        ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
            backgroundColor: "#4b5563",
            color: "#fff",
        },
        ".cm-completionLabel": {
            fontWeight: "500",
        },
        ".cm-completionDetail": {
            color: "#9ca3af",
            marginLeft: "0.75em",
            fontStyle: "normal",
        },
    },
    { dark: true },
);

export const noteEditorStyling = [
    noteEditorTheme,
    syntaxHighlighting(markdownHighlight),
];
