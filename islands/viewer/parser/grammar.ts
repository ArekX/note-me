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
    extends TreeNode<"heading", { level: number; text: string }> {}

const parseHeadingRule = rule(
    () =>
        exactly(
            minOf(1, token("hash")),
            minOf(
                1,
                either(
                    token("whitespace"),
                    token("text-block"),
                ),
            ),
        ),
    (parsed) => {
        const parsedValue = parsed as RecursiveResult[];

        return {
            type: "heading",
            data: {
                level: (parsedValue[0] as ParsedToken[]).length,
                text: (parsedValue[1] as ParsedToken[]).map((t) => t.value)
                    .join(""),
            },
        } as HeadingNode;
    },
);

interface TextBlockNode extends TreeNode<"text-block", { text: string }> {}

const parseTextBlockRule = rule(
    () =>
        minOf(
            1,
            either(
                token("text-block"),
                token("whitespace"),
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

const parseNewLine = rule(
    () => token("new-line"),
    () => {
        return {
            type: "new-line",
        } as NewLineNode;
    },
);

interface ImageNode extends TreeNode<"image", { alt: string; link: string }> {}

const parseImage = rule(
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

const parseLink = rule(
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

export type TreeNodes =
    | HeadingNode
    | StatementNode
    | TextBlockNode
    | NewLineNode
    | ImageNode
    | LinkNode;

type StatementNode = TreeNode<"statement">;

export const parseStatement = rule(
    () =>
        either(
            parseHeadingRule,
            parseNewLine,
            parseTextBlockRule,
            parseImage,
            parseLink,
        ),
    (rootValue) => rootValue as TreeNodes,
);
