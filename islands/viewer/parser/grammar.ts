import { RecursiveResult } from "./rule.ts";
import {
    either,
    exactly,
    minOf,
    optional,
    rule,
    token,
    TreeNode,
} from "./rule.ts";

import { ParsedToken } from "./tokenizers.ts";

interface HeadingNode
    extends TreeNode<"heading", { level: number; text: RecursiveResult }> {}

const heading = rule(
    () =>
        exactly(
            minOf(1, token("hash")),
            expression,
            token("new-line"),
        ),
    (parsed) => {
        const parsedValue = parsed as RecursiveResult[];

        return {
            type: "heading",
            data: {
                level: (parsedValue[0] as ParsedToken[]).length,
                text: parsedValue[1] as RecursiveResult,
            },
        } as HeadingNode;
    },
);

interface TextBlockNode extends TreeNode<"text-block", { text: string }> {}

const textBlock = rule(
    () =>
        minOf(
            1,
            either(
                token("text-block"),
                token("whitespace"),
                token("html-tag"),
                token("number"),
            ),
        ),
    (parsed) => {
        const parsedValue = parsed as RecursiveResult[];

        return {
            type: "text-block",
            data: {
                text: (parsedValue as ParsedToken[]).map((t) => t.value)
                    .join(""),
            },
        } as TextBlockNode;
    },
);

interface NewLineNode extends TreeNode<"new-line"> {}

const newLine = rule(
    () => token("new-line"),
    () => {
        return {
            type: "new-line",
        } as NewLineNode;
    },
);

interface ImageNode extends TreeNode<"image", { alt: string; link: string }> {}

const image = rule(
    () =>
        exactly(
            token("exclamation"),
            optional(token("whitespace")),
            token("bracket"),
            optional(token("whitespace")),
            token("parentheses"),
        ),
    (parsed) => {
        const value = parsed as ParsedToken[];
        return {
            type: "image",
            data: {
                alt: value[2].value,
                link: value[4].value,
            },
        } as ImageNode;
    },
);

interface LinkNode extends TreeNode<"link", { text: string; link: string }> {}

const link = rule(
    () =>
        exactly(
            token("bracket"),
            optional(token("whitespace")),
            token("parentheses"),
        ),
    (parsed) => {
        const value = parsed as ParsedToken[];
        return {
            type: "link",
            data: {
                text: value[0].value,
                link: value[2].value,
            },
        } as LinkNode;
    },
);

interface CodeBlockNode
    extends TreeNode<"code-block", { code: string; language: string }> {}

const codeBlock = rule(
    () => token("backtick-block"),
    (parsed) => {
        const value = parsed as Extract<
            ParsedToken,
            { type: "backtick-block" }
        >;
        return {
            type: "code-block",
            data: {
                code: value?.value ?? "",
                language: value?.data?.language ?? "",
            },
        } as CodeBlockNode;
    },
);

interface ExtensionCommandNode
    extends TreeNode<"extension-command", { command: string; data: string }> {}

const extensionCommand = rule(
    () =>
        exactly(
            token("at-sign"),
            optional(token("whitespace")),
            token("bracket"),
            optional(token("whitespace")),
            optional(token("parentheses")),
        ),
    (parsed) => {
        const value = parsed as ParsedToken[];
        return {
            type: "extension-command",
            data: {
                command: value[2].value,
                data: value[4].value ?? "",
            },
        } as ExtensionCommandNode;
    },
);

interface BlockQuoteNode
    extends TreeNode<"block-quote", { lines: RecursiveResult[] }> {}

const blockQuote = rule(
    () =>
        minOf(
            1,
            exactly(
                token("blockquote"),
                parseStatement,
                token("new-line"),
                optional(token("whitespace")),
            ),
        ),
    (parsed) => {
        const value = parsed as RecursiveResult[][];
        const lines = value.map((block: RecursiveResult[]) => {
            return block[1] as RecursiveResult;
        });

        return {
            type: "block-quote",
            data: { lines },
        } as BlockQuoteNode;
    },
);

interface ItalicizedNode
    extends TreeNode<"italicized", { text: RecursiveResult }> {}

const italicString = rule(
    () =>
        either(
            exactly(
                token("star"),
                expression,
                token("star"),
            ),
            exactly(
                token("underscore"),
                expression,
                token("underscore"),
            ),
        ),
    (parsed) => {
        const value = (parsed as RecursiveResult[])[1] as RecursiveResult;

        return {
            type: "italicized",
            data: { text: value },
        } as ItalicizedNode;
    },
);

interface BoldedNode extends TreeNode<"bolded", { text: RecursiveResult }> {}

const boldString = rule(
    () =>
        either(
            exactly(
                token("star"),
                token("star"),
                expression,
                token("star"),
                token("star"),
            ),
            exactly(
                token("underscore"),
                token("underscore"),
                expression,
                token("underscore"),
                token("underscore"),
            ),
        ),
    (parsed) => {
        const value = (parsed as RecursiveResult[])[1] as RecursiveResult;

        return {
            type: "bolded",
            data: { text: value },
        } as BoldedNode;
    },
);

interface BacktickedNode extends TreeNode<"backticked", { text: string }> {}

const backtickString = rule(
    () => token("backtick"),
    (parsed) => {
        const value = parsed as Extract<ParsedToken, { type: "backtick" }>;

        return {
            type: "backticked",
            data: { text: value.value },
        } as BacktickedNode;
    },
);

interface UnorderedListNode extends
    TreeNode<"unordered-list", {
        items: {
            level: number;
            value: RecursiveResult;
        }[];
    }> {}

const unorderedList = rule(
    () =>
        minOf(
            1,
            exactly(
                optional(token("whitespace")),
                token("star"),
                expression,
                token("new-line"),
            ),
        ),
    (parsed) => {
        return {
            type: "unordered-list",
            data: {
                items: (parsed as RecursiveResult[][]).map((p) => {
                    return {
                        level: (p[0] as ParsedToken).type === "whitespace"
                            ? (p[0] as ParsedToken).value.length
                            : 0,
                        value: p[2] as RecursiveResult,
                    };
                }),
            },
        } as UnorderedListNode;
    },
);

interface OrderedListNode extends
    TreeNode<"ordered-list", {
        items: {
            level: number;
            value: RecursiveResult;
        }[];
    }> {}

const orderedList = rule(
    () =>
        minOf(
            1,
            exactly(
                optional(token("whitespace")),
                token("number"),
                token("dot"),
                expression,
                token("new-line"),
            ),
        ),
    (parsed) => {
        return {
            type: "ordered-list",
            data: {
                items: (parsed as RecursiveResult[][]).map((p) => {
                    return {
                        level: (p[0] as ParsedToken).type === "whitespace"
                            ? (p[0] as ParsedToken).value.length
                            : 0,
                        value: p[3] as RecursiveResult,
                    };
                }),
            },
        } as OrderedListNode;
    },
);

type ExpressionNode = TreeNode<"expression">;

export const expression = rule(
    () =>
        either(
            backtickString,
            extensionCommand,
            image,
            link,
            boldString,
            italicString,
            orderedList,
            unorderedList,
            textBlock,
        ),
    (expression) => ({
        type: "expression",
        children: [expression],
    } as ExpressionNode),
);

type StatementNode = TreeNode<"statement">;

export type TreeNodes =
    | HeadingNode
    | StatementNode
    | TextBlockNode
    | NewLineNode
    | ImageNode
    | OrderedListNode
    | BoldedNode
    | BlockQuoteNode
    | UnorderedListNode
    | BacktickedNode
    | ExtensionCommandNode
    | CodeBlockNode
    | ItalicizedNode
    | ExpressionNode
    | LinkNode;

export const parseStatement = rule(
    () =>
        either(
            heading,
            newLine,
            codeBlock,
            blockQuote,
            expression,
        ),
    (rootValue) => rootValue as TreeNodes,
);
