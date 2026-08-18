// Vendored from https://deno.land/x/rusty_markdown@v0.4.1 (MIT license).
// Remote https imports cannot be bundled into the browser build by the
// Fresh vite plugin, so the package is kept locally.
import { Token } from "./event.ts";
export type { Token };

// @deno-types="./wasm/deno_rusty_markdown.d.ts"
import {
    html as html_,
    tokens as tokens_,
} from "./wasm/deno_rusty_markdown.js";

/**
 * Option object containing flags for enabling extra features that are not part
 * of the CommonMark spec.
 */
export interface Options {
    /** Enables Github flavored tables. */
    tables?: boolean;
    /**
     * Enables footnotes[^1].
     *
     * [^1]: Like this.
     */
    footnotes?: boolean;
    /** Enables strikethrough text, ~~like this~~. */
    strikethrough?: boolean;
    /** Enables Github flavored task lists. */
    tasklists?: boolean;
    /** Enables smart punctuation (turns -- into –) */
    smartPunctuation?: boolean;
}

/**
 * Encodes options to pass them to WebAssembly
 *
 * @param options - Options to encode
 * @returns Encoded options
 */
function encodeOptions(options: Options): number {
    return (+(options.tables ?? false) << 1) +
        (+(options.footnotes ?? false) << 2) +
        (+(options.strikethrough ?? false) << 3) +
        (+(options.tasklists ?? false) << 4) +
        (+(options.smartPunctuation ?? false) << 5);
}

/** Parses the given Markdown text into a list of tokens. */
export function tokens(text: string, options: Options = {}): Token[] {
    return tokens_(text, encodeOptions(options));
}

/** Parses the given tokens into HTML. */
export function html(tokens: Token[]): string {
    return html_(tokens);
}
