import { createReader } from "./reader.ts";
import { tokenizers, TokenParser } from "./tokenizers.ts";

export type ResultToken = NonNullable<ReturnType<TokenParser>>;

export const lex = (text: string): ResultToken[] => {
    const reader = createReader(text);
    const results: ResultToken[] = [];

    while (!reader.isEof()) {
        let tokenAdded = false;
        for (const tokenize of tokenizers) {
            const token = tokenize(reader);
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

    return results;
};
