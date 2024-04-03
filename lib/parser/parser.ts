import { parseStatement } from "./grammar.ts";
import { createReader } from "./reader.ts";
import { ParsedToken } from "./tokenizers.ts";

export const parse = (tokens: ParsedToken[]) => {
    const reader = createReader(tokens);

    const statements = [];

    while (!reader.isEof()) {
        const result = parseStatement(reader);

        // console.log(result, reader.peek(10));

        if (!result) {
            console.log("Unparsed", reader.peek());
            // TODO: throw error here
            break;
        }

        statements.push(result);
    }

    return statements;
};
