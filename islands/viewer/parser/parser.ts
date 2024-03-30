import { parseStatement } from "./grammar.ts";
import { createReader } from "./reader.ts";
import { TokenParser } from "./tokenizers.ts";

export type ResultToken = NonNullable<ReturnType<TokenParser>>;

export const parse = (tokens: ResultToken[]) => {
    const reader = createReader(tokens);

    const statements = [];

    while (!reader.isEof()) {
        const result = parseStatement(reader);

        // console.log(result, reader.peek(10));

        if (!result) {
            // TODO: throw error here
            break;
        }

        statements.push(result);
    }

    return statements;
};
