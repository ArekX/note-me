export { default as highlightJs } from "highlight.js";
export { type Token, tokens } from "$lib/rusty-markdown/mod.ts";
export { diff } from "@opentf/obj-diff";
export { decodeBase64, encodeBase64 } from "@std/encoding/base64";
export {
    browserSupportsWebAuthn,
    startAuthentication,
    startRegistration,
} from "@simplewebauthn/browser";

export { default as mermaid } from "mermaid";

export {
    Compartment,
    EditorSelection,
    EditorState,
    type Extension,
    Prec,
    StateEffect,
    StateField,
    Transaction,
} from "@codemirror/state";
export {
    Decoration,
    type DecorationSet,
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightSpecialChars,
    keymap,
    placeholder as cmPlaceholder,
    rectangularSelection,
    ViewPlugin,
    type ViewUpdate,
} from "@codemirror/view";
export {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
    standardKeymap,
} from "@codemirror/commands";
export {
    bracketMatching,
    HighlightStyle,
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
    syntaxTree,
} from "@codemirror/language";
export {
    acceptCompletion,
    autocompletion,
    type Completion,
    CompletionContext,
    completionKeymap,
    type CompletionResult,
    type CompletionSource,
} from "@codemirror/autocomplete";
export { markdown, markdownLanguage } from "@codemirror/lang-markdown";
export { tags as highlightTags } from "@lezer/highlight";
