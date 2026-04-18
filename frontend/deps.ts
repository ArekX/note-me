export { default as highlightJs } from "npm:highlight.js@11.9.0";
export {
    type Token,
    tokens,
} from "https://deno.land/x/rusty_markdown@v0.4.1/mod.ts";
export { diff } from "jsr:@opentf/obj-diff";
export { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";
export {
    browserSupportsWebAuthn,
    startAuthentication,
    startRegistration,
} from "npm:@simplewebauthn/browser@13.1.2";

export { default as mermaid } from "npm:mermaid@11.10.1";

export {
    Compartment,
    EditorSelection,
    EditorState,
    type Extension,
    Prec,
    StateEffect,
    StateField,
    Transaction,
} from "npm:@codemirror/state@6.5.0";
export {
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightSpecialChars,
    keymap,
    placeholder as cmPlaceholder,
    rectangularSelection,
    type ViewUpdate,
} from "npm:@codemirror/view@6.35.3";
export {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
    standardKeymap,
} from "npm:@codemirror/commands@6.7.1";
export {
    bracketMatching,
    HighlightStyle,
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
} from "npm:@codemirror/language@6.10.6";
export {
    acceptCompletion,
    autocompletion,
    type Completion,
    CompletionContext,
    completionKeymap,
    type CompletionResult,
    type CompletionSource,
} from "npm:@codemirror/autocomplete@6.18.3";
export {
    markdown,
    markdownLanguage,
} from "npm:@codemirror/lang-markdown@6.3.2";
export { tags as highlightTags } from "npm:@lezer/highlight@1.2.1";
