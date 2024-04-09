import { Token, tokens } from "$frontend/deps.ts";

export type AstNode = AstContainerNode | AstContentNode;

type AstContentNode =
    | AstContentNodeOf<"text">
    | AstContentNodeOf<"code">
    | AstContentNodeOf<"html">
    | AstContentNodeOf<"footnoteReference">
    | AstContentNodeOf<"softBreak">
    | AstContentNodeOf<"hardBreak">
    | AstContentNodeOf<"rule">
    | AstContentNodeOf<"taskListMarker">;

type AstContainerNode =
    | RootAstNode
    | AstContainerNodeOf<"list", { type: "ordered" | "unordered" }>
    | AstContainerNodeOf<"link", { title: string; url: string }>
    | AstContainerNodeOf<"image", { title: string; url: string }>
    | AstContainerNodeOf<"blockQuote">
    | AstContainerNodeOf<"heading">
    | AstContainerNodeOf<"strikethrough">
    | AstContainerNodeOf<"emphasis">
    | AstContainerNodeOf<"strong">
    | AstContainerNodeOf<"listItem">
    | AstContainerNodeOf<"paragraph">
    | AstContainerNodeOf<"table">
    | AstContainerNodeOf<"tableHead">
    | AstContainerNodeOf<"tableRow">
    | AstContainerNodeOf<"tableCell">
    | AstContainerNodeOf<"footnoteDefinition", { label: string }>
    | AstContainerNodeOf<"codeBlock", { language: string }>;

type RootAstNode = AstContainerNodeOf<"root">;

interface AstNodeOf<T> {
    type: T;
}

interface AstContentNodeOf<T> extends AstNodeOf<T> {
    content: string;
}

interface AstContainerNodeOf<T, Data = null> extends AstNodeOf<T> {
    data: Data;
    children: AstNode[];
}

type TextToken = Token & { content: string };

const groupTextTokens = (tokens: Token[]): Token[] => {
    const result = [];
    let textToken: TextToken | null = null;

    for (const token of tokens) {
        if (token.type !== "text" && token.type !== "html") {
            textToken = null;
            result.push(token);
            continue;
        }

        if (textToken === null) {
            textToken = { ...token, type: "text" } as TextToken;
            result.push(textToken);
            continue;
        }

        textToken.content += token.content;
    }

    return result;
};

const createContainerNode = (
    token: Extract<Token, { type: "start" | "end" }>,
): AstContainerNode => {
    const type = token.tag as AstContainerNode["type"];

    switch (type) {
        case "codeBlock":
            return {
                type,
                data: {
                    language: (token as { language?: string }).language ?? "",
                },
                children: [],
            };
        case "list":
            return {
                type,
                data: {
                    type: "startNumber" in token ? "ordered" : "unordered",
                },
                children: [],
            };
        case "link":
            /* falls through */
        case "image": {
            const { url, title } = token as { url: string; title: string };
            return {
                type,
                data: { url, title },
                children: [],
            };
        }
        case "footnoteDefinition":
            return {
                type,
                data: {
                    label: (token as { label: string }).label,
                },
                children: [],
            };
    }

    return {
        type,
        data: null,
        children: [],
    };
};

const toSyntaxTree = (tokens: Token[]): RootAstNode => {
    const root: RootAstNode = {
        type: "root",
        data: null,
        children: [],
    };
    const stack: AstContainerNode[] = [root];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type == "end") {
            if (stack.length == 1) {
                return root;
            }

            stack.pop();
            continue;
        } else if (token.type == "start") {
            const parent = createContainerNode(token);
            stack[stack.length - 1].children.push(parent!);
            stack.push(parent!);
            continue;
        }

        stack[stack.length - 1].children.push({
            ...token,
        } as AstNode);
    }

    return root;
};

export const parseMarkdown = (markdownText: string): RootAstNode =>
    toSyntaxTree(groupTextTokens(tokens(markdownText, {
        footnotes: true,
        tables: true,
        strikethrough: true,
        tasklists: true,
    })));
