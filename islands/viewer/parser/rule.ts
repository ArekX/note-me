import { ParsedToken } from "./tokenizers.ts";
import { Reader } from "./reader.ts";
import { TreeNodes } from "./grammar.ts";

export type RecursiveResult =
    | ParsedToken
    | ParsedToken[]
    | IgnoreNode
    | IgnoreNode[]
    | TreeNodes
    | TreeNodes[]
    | RecursiveResult[];

export interface TreeNode<T, Data = never> {
    type: T;
    data?: Data;
    children?: RecursiveResult[];
}

export interface IgnoreNode extends TreeNode<"ignore"> {}

export type TokenParserFn = (
    reader: Reader<ParsedToken>,
) => RecursiveResult | null;

export type RuleFn = (
    reader: Reader<ParsedToken>,
) => RecursiveResult | null;

export type MatchFn = (
    matched: RecursiveResult | RecursiveResult[],
) => TreeNodes;

export type Rules = RuleFn | TokenParserFn;

export const rule = (
    getRule: () => TokenParserFn,
    onMatch: MatchFn,
): RuleFn =>
(reader: Reader<ParsedToken>) => {
    const checkRule = getRule();
    const result = checkRule(reader);
    return result ? onMatch(result) : null;
};

export const exactly =
    (...checks: TokenParserFn[]): TokenParserFn =>
    (reader: Reader<ParsedToken>) => {
        reader.begin();

        const results = [];

        for (const check of checks) {
            const match = check(reader);

            if (!match) {
                reader.rollback();
                return null;
            }

            results.push(match);
        }

        reader.commit();

        return results;
    };

export const either =
    (...checks: TokenParserFn[]): TokenParserFn =>
    (reader: Reader<ParsedToken>) => {
        for (const check of checks) {
            reader.begin();

            const match = check(reader);
            if (match) {
                reader.commit();
                return match;
            }

            reader.rollback();
        }

        return null;
    };

export const optional = (
    check: TokenParserFn,
    getOptional?: () => RecursiveResult,
): TokenParserFn =>
(reader: Reader<ParsedToken>) => {
    reader.begin();
    const result = check(reader);

    if (!result) {
        reader.rollback();
        return getOptional ? getOptional() : { type: "ignore" } as IgnoreNode;
    }

    reader.commit();
    return result;
};

export const minOf =
    (amount: number, check: TokenParserFn) => (reader: Reader<ParsedToken>) => {
        reader.begin();

        const results = [];

        let result = null;

        while (true) {
            result = check(reader);

            if (result) {
                results.push(result);
                continue;
            }

            if (results.length < amount) {
                reader.rollback();
                return null;
            }

            break;
        }

        reader.commit();
        return results;
    };

export const token =
    (type: ParsedToken["type"], value?: ParsedToken["value"]) =>
    (reader: Reader<ParsedToken>): ParsedToken | null => {
        const readToken = reader.peek() as ParsedToken;

        if (
            readToken &&
            (readToken.type !== type || (value && readToken.value !== value))
        ) {
            return null;
        }

        reader.next();

        return readToken;
    };
