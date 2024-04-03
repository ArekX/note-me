import { IgnoreNode, RecursiveResult, TokenParserFn } from "./rule.ts";
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

const groupTextNodes = (values: TreeNodes[]) => {
    const resultNodes = [];
    let lastValue: TextNode | null = null;
    for (const value of values) {
        if (value.type !== "text") {
            lastValue = null;
            resultNodes.push(value);
            continue;
        }

        if (!lastValue) {
            lastValue = value;
            resultNodes.push(value);
            continue;
        }

        lastValue.data!.value += value.data!.value;
    }

    return resultNodes;
};

const whitespaceAllowed = optional(token("whitespace"));

interface TextNode extends TreeNode<"text", { value: string }> {}

const textExcept = (...excludeTokens: (ParsedToken["type"])[]) => {
    const tokens = [
        "html-tag",
        "hash",
        "number",
        "blockquote",
        "exclamation",
        "dot",
        "whitespace",
        "star",
        "underscore",
        "minus",
        "equals",
        "at-sign",
        "word",
        "hash",
    ]
        .filter((token) =>
            !excludeTokens.includes(token as ParsedToken["type"])
        )
        .map((t) => token(t as ParsedToken["type"]));

    return rule(
        () => either(...tokens),
        (parsed) => {
            const { value } = parsed as ParsedToken;

            return {
                type: "text",
                data: {
                    value,
                },
            } as TextNode;
        },
    );
};

const inlineExpressionExcept = (...excludeExpression: TokenParserFn[]) => {
    const expressions = [
        italic,
        bold,
        code,
        image,
        link,
        extensionCommand,
    ].filter((expression) => !excludeExpression.includes(expression));

    return rule(
        () => either(...expressions),
        (parsed) => parsed as TreeNodes,
    );
};

interface ItalicNode extends TreeNode<"italic", { value: RecursiveResult }> {}

const italicRuleWith = (
    wrapper: ParsedToken["type"],
) => {
    return exactly(
        token(wrapper),
        minOf(
            1,
            either(
                inlineExpressionExcept(image, italic),
                textExcept(wrapper),
            ),
        ),
        token(wrapper),
    );
};
const italic = rule(
    () =>
        either(
            italicRuleWith("underscore"),
            italicRuleWith("star"),
        ),
    (parsed) => {
        const [, value] = parsed as RecursiveResult[];
        return {
            type: "italic",
            data: {
                value: groupTextNodes(value as TreeNodes[]),
            },
        } as ItalicNode;
    },
);

interface BoldNode extends TreeNode<"bold", { value: RecursiveResult }> {}

const boldRuleWith = (wrapper: ParsedToken["type"]) =>
    exactly(
        token(wrapper),
        whitespaceAllowed,
        token(wrapper),
        minOf(
            1,
            either(
                inlineExpressionExcept(image),
                textExcept(wrapper),
            ),
        ),
        token(wrapper),
        whitespaceAllowed,
        token(wrapper),
    );

const bold = rule(
    () =>
        either(
            boldRuleWith("underscore"),
            boldRuleWith("star"),
        ),
    (parsed) => {
        const [, , , value] = parsed as RecursiveResult[];
        return {
            type: "bold",
            data: {
                value: groupTextNodes(value as TreeNodes[]),
            },
        } as BoldNode;
    },
);

interface ImageNode
    extends TreeNode<"image", { altText: string; link: string }> {}

const image = rule(
    () =>
        exactly(
            token("exclamation"),
            whitespaceAllowed,
            token("bracket"),
            whitespaceAllowed,
            token("parentheses"),
        ),
    (parsed) => {
        const [, , altToken, , linkToken] = parsed as ParsedToken[];
        return {
            type: "image",
            data: {
                altText: altToken.value,
                link: linkToken.value,
            },
        } as ImageNode;
    },
);

interface LinkNode extends TreeNode<"link", { text: string; link: string }> {}

const link = rule(
    () =>
        exactly(
            token("bracket"),
            whitespaceAllowed,
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

interface ExtensionCommandNode
    extends TreeNode<"extension-command", { command: string; data: string }> {}

const extensionCommand = rule(
    () =>
        exactly(
            token("at-sign"),
            whitespaceAllowed,
            token("bracket"),
            whitespaceAllowed,
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

interface CodeNode extends TreeNode<"code", { text: string }> {}

const code = rule(
    () =>
        either(
            token("backtick"),
            token("backtick-block"),
        ),
    (parsed) => {
        const value = parsed as Extract<
            ParsedToken,
            { type: "backtick" | "backtick-block" }
        >;

        return {
            type: "code",
            data: { text: value.value },
        } as CodeNode;
    },
);

interface HeadingStatementNode
    extends TreeNode<"heading", { level: number; text: RecursiveResult }> {}

const headingStatement = rule(
    () =>
        exactly(
            minOf(1, token("hash")),
            minOf(
                1,
                either(
                    inlineExpressionExcept(image),
                    textExcept("hash"),
                ),
            ),
        ),
    (parsed) => {
        const parsedValue = parsed as RecursiveResult[];

        return {
            type: "heading",
            data: {
                level: (parsedValue[0] as ParsedToken[]).length,
                text: groupTextNodes(parsedValue[1] as TreeNodes[]),
            },
        } as HeadingStatementNode;
    },
);

interface BlockquoteStatementNode
    extends TreeNode<"blockquote", { items: RecursiveResult[] }> {}

const blockquoteExpression = rule(
    () =>
        exactly(
            token("blockquote"),
            minOf(
                1,
                either(
                    rootExpression,
                    textExcept("blockquote"),
                ),
            ),
            optional(token("new-line")),
        ),
    (parsed) => parsed as TreeNodes,
);

const blockquoteStatement = rule(
    () => minOf(1, blockquoteExpression),
    (parsed) => {
        const parsedValues = parsed as RecursiveResult[][];

        return {
            type: "blockquote",
            data: {
                items: groupTextNodes(
                    parsedValues.flatMap((value) => value[1]) as TreeNodes[],
                ),
            },
        } as BlockquoteStatementNode;
    },
);

interface TextStatementNode
    extends TreeNode<"text-statement", { items: RecursiveResult[] }> {}

const textStatement = rule(
    () =>
        minOf(
            1,
            either(
                inlineExpressionExcept(),
                textExcept(),
            ),
        ),
    (parsed) => {
        const parsedValues = parsed as RecursiveResult[];
        return {
            type: "text-statement",
            data: {
                items: groupTextNodes(parsedValues as TreeNodes[]),
            },
        } as TextStatementNode;
    },
);

type NewLineStatementNode = TreeNode<"new-line">;
type StatementNode = TreeNode<"statement">;

export type TreeNodes =
    | HeadingStatementNode
    | BlockquoteStatementNode
    | TextStatementNode
    | NewLineStatementNode
    | StatementNode
    | CodeNode
    | ExtensionCommandNode
    | ItalicNode
    | BoldNode
    | TextNode
    | ImageNode
    | LinkNode;

export const rootExpression = rule(
    () =>
        either(
            headingStatement,
            blockquoteStatement,
            inlineExpressionExcept(),
            textStatement,
        ),
    (parsed) => parsed as TreeNodes,
);

export const parseStatement = rule(
    () =>
        exactly(
            optional(rootExpression),
            either(token("new-line"), token("eof")),
        ),
    (rootValue) => {
        const [expression] = rootValue as RecursiveResult[];

        if (
            (expression as IgnoreNode).type === "ignore"
        ) {
            return {
                type: "new-line",
            } as NewLineStatementNode;
        }

        return expression as TreeNodes;
    },
);
