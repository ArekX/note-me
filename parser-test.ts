import { parse } from "$lib/parser/parser.ts";
import { lex } from "$lib/parser/lexer.ts";

const tokens = lex(`
# idemo niis

![nako neki](https://google.com)
ovo je nako neki # [tekst](link).
`);

console.log(tokens);

const ast = parse(tokens);

console.dir(ast, { depth: null });
