import { Token, tokens } from "$frontend/deps.ts";

export type AstNode = AstContainerNode | AstContentNode;

export type AstContentNode =
    | AstContentNodeOf<"text">
    | AstContentNodeOf<"code">
    | (AstContentNodeOf<"footnoteReference"> & { label: string })
    | AstContentNodeOf<"softBreak">
    | AstContentNodeOf<"hardBreak">
    | AstContentNodeOf<"rule">
    | (AstContentNodeOf<"image"> & { title: string; url: string })
    | (AstContentNodeOf<"extension"> & { extension: string; params: string[] })
    | (AstContentNodeOf<"taskListMarker"> & { checked: boolean });

export type AstContainerNode =
    | RootAstNode
    | AstContainerNodeOf<"list", { type: "ordered" | "unordered" }>
    | AstContainerNodeOf<"link", { title: string; url: string }>
    | AstContainerNodeOf<"blockQuote">
    | AstContainerNodeOf<"heading", { level: number }>
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

type ExtensionToken = {
    type: "extension";
    extension: string;
    params: string[];
};

type ImageToken = {
    type: "image";
    title: string;
    url: string;
};

type Tokens = ExtensionToken | Token | ImageToken;

type TokenPipelineFn = (tokens: Tokens[]) => Tokens[];

const removeExtensionEscape = (text: string): string =>
    text.replace(/\\\{/g, "{");

const parseImageTokens: TokenPipelineFn = (tokens: Tokens[]): Tokens[] => {
    const result = [];
    const imageStack: { title: string; url: string }[] = [];

    for (const token of tokens) {
        if (token.type === "start" && token.tag === "image") {
            imageStack.push({ title: "", url: token.url });
        } else if (token.type === "end" && token.tag === "image") {
            result.push({
                type: "image",
                ...imageStack.pop()!,
            });
            continue;
        }

        if (imageStack.length === 0) {
            result.push(token);
        }

        if (imageStack.length > 0 && token.type === "text") {
            imageStack[imageStack.length - 1].title += token.content;
        }
    }

    return result as Tokens[];
};

const extensionLimits = {
    "note-list": 10,
    "note-link": 20,
} as const;

const extensionRegex =
    /(?<!\\){\:(?<extension>[a-zA-Z0-9-]+)(?<params>(\|[^}]+)*)\}/;

const parseExtensions: TokenPipelineFn = (tokens: Tokens[]): Tokens[] => {
    const results: Tokens[] = [];

    const extensionCounters: Record<keyof typeof extensionLimits, number> = {
        "note-list": 0,
        "note-link": 0,
    };

    for (const token of tokens) {
        if (token.type !== "text") {
            results.push(token);
            continue;
        }

        let text = token.content;
        let match = text.match(extensionRegex);

        while (match) {
            const {
                0: matched,
                index,
                groups: { extension, params: paramString } = {},
            } = match!;

            const params = paramString.slice(1).split("|");

            const leftSide = text.slice(0, index);

            if (leftSide.length > 0) {
                results.push({
                    type: "text",
                    content: removeExtensionEscape(leftSide),
                });
            }

            text = text.slice(index! + matched.length);
            match = text.match(extensionRegex);

            if (extension in extensionCounters) {
                const checkExtension =
                    extension as keyof typeof extensionLimits;
                extensionCounters[checkExtension]++;

                if (
                    extensionCounters[checkExtension] >
                        extensionLimits[checkExtension]
                ) {
                    results.push({
                        type: "extension",
                        extension: "over-limit",
                        params: [
                            extension,
                            extensionCounters[checkExtension].toString(),
                            extensionLimits[checkExtension].toString(),
                        ],
                    });
                    continue;
                }
            }

            results.push({
                type: "extension",
                extension,
                params,
            });
        }

        if (text.length > 0) {
            results.push({
                type: "text",
                content: removeExtensionEscape(text),
            });
        }
    }

    return results;
};

const groupTextTokens: TokenPipelineFn = (tokens: Tokens[]): Tokens[] => {
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
        case "link": {
            const { url, title } = token as { url: string; title: string };
            return {
                type,
                data: { url, title },
                children: [],
            };
        }
        case "heading":
            return {
                type,
                data: {
                    level: (token as { level: number }).level,
                },
                children: [],
            };
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

const toSyntaxTree = (tokens: Tokens[]): RootAstNode => {
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

const pipeline: TokenPipelineFn[] = [
    parseImageTokens,
    parseExtensions,
    groupTextTokens,
];

export const parsePipeline = (markdownText: string): Tokens[] =>
    pipeline.reduce(
        (result, fn) => fn(result),
        tokens(markdownText, {
            footnotes: true,
            tables: true,
            strikethrough: true,
            tasklists: true,
        }) as Tokens[],
    );

export const parseMarkdown = (markdownText: string): RootAstNode =>
    toSyntaxTree(parsePipeline(markdownText));
