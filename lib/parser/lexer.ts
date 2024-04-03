import { createReader } from "./reader.ts";
import { ParsedToken, tokenizers, TokenizerState } from "./tokenizers.ts";

export const lex = (text: string): ParsedToken[] => {
    const reader = createReader(text);
    const results: ParsedToken[] = [];

    const state: TokenizerState = {
        isEscapeMode: false,
    };

    while (!reader.isEof()) {
        let tokenAdded = false;
        for (const tokenize of tokenizers) {
            const token = tokenize(reader, state);
            if (token) {
                results.push(token);
                tokenAdded = true;
                break;
            }
        }

        if (tokenAdded) {
            continue;
        }

        const { line, character } = reader.getAt();
        throw new Error(`Unexpected token at ${line}:${character}.`);
    }

    results.push({ type: "eof", value: "" });

    return results;
};
