import MarkdownIt from "markdown-it";
import type { StateCore, StateInline, Token } from "markdown-it";
import footnote from "markdown-it-footnote";

export type AstContentNode =
    | { type: "text"; content: string }
    | { type: "code"; content: string }
    | { type: "footnoteReference"; label: string }
    | { type: "softBreak" }
    | { type: "hardBreak" }
    | { type: "rule" }
    | { type: "image"; title: string; url: string }
    | { type: "extension"; extension: string; params: string[] }
    | { type: "taskListMarker"; checked: boolean };

type ContainerOf<T extends string, Data = null> = {
    type: T;
    data: Data;
    children: AstNode[];
};

export type RootAstNode = ContainerOf<"root">;

export type AstContainerNode =
    | RootAstNode
    | ContainerOf<"list", { type: "ordered" | "unordered" }>
    | ContainerOf<"link", { title: string; url: string }>
    | ContainerOf<"blockQuote">
    | ContainerOf<"heading", { level: number }>
    | ContainerOf<"strikethrough">
    | ContainerOf<"emphasis">
    | ContainerOf<"strong">
    | ContainerOf<"listItem">
    | ContainerOf<"paragraph">
    | ContainerOf<"table">
    | ContainerOf<"tableHead">
    | ContainerOf<"tableRow">
    | ContainerOf<"tableCell">
    | ContainerOf<"footnoteDefinition", { label: string }>
    | ContainerOf<"codeBlock", { language: string }>;

export type AstNode = AstContainerNode | AstContentNode;

export type AstNodeOf<T extends AstNode["type"]> = Extract<
    AstNode,
    { type: T }
>;

const extensionLimits: Record<string, number> = {
    "note-list": 10,
    "note-link": 20,
    audio: 20,
    video: 20,
};

const extensionPattern = /^\{:([a-zA-Z0-9-]+)((?:\|[^}\n]+)*)\}/;

interface ExtensionMeta {
    extension: string;
    params: string[];
}

interface ParseEnv {
    extensionCounts?: Record<string, number>;
}

// "{" is a terminator of markdown-it's text rule, so this runs at every brace;
// "\{" never reaches it because the escape rule consumes it first.
const extensionRule = (state: StateInline, silent: boolean): boolean => {
    if (state.src.charCodeAt(state.pos) !== 0x7b) {
        return false;
    }

    const match = extensionPattern.exec(
        state.src.slice(state.pos, state.posMax),
    );
    if (!match) {
        return false;
    }

    if (!silent) {
        const [, extension, paramString] = match;
        const params = paramString!.slice(1).split("|");
        const token = state.push("extension", "", 0);
        token.meta = { extension, params };
        token.content = match[0];

        const limit = extensionLimits[extension!];
        if (limit !== undefined) {
            const env = state.env as ParseEnv;
            env.extensionCounts ??= {};
            const count = (env.extensionCounts[extension!] ?? 0) + 1;
            env.extensionCounts[extension!] = count;
            if (count > limit) {
                token.meta = {
                    extension: "over-limit",
                    params: [extension, count.toString(), limit.toString()],
                };
            }
        }
    }

    state.pos += match[0].length;
    return true;
};

const taskMarkerPattern = /^\[([ xX])\](?:\s+|$)/;

// GitHub task lists: "[ ]" or "[x]" opening the first paragraph of a list item.
const taskListRule = (state: StateCore) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
        const inline = tokens[i]!;
        if (
            inline.type !== "inline" ||
            tokens[i - 1]!.type !== "paragraph_open" ||
            tokens[i - 2]!.type !== "list_item_open"
        ) {
            continue;
        }

        const first = inline.children?.[0];
        const match =
            first?.type === "text" && taskMarkerPattern.exec(first.content);
        if (!first || !match) {
            continue;
        }

        const marker = new state.Token("task_list_marker", "", 0);
        marker.meta = { checked: match[1] !== " " };
        first.content = first.content.slice(match[0].length);
        inline.children!.unshift(marker);
    }
};

// html: false keeps raw HTML as escaped text, as the original did.
const parser = new MarkdownIt({ html: false }).use(footnote).use((md) => {
    md.inline.ruler.before("text", "extension", extensionRule);
    md.core.ruler.after("text_join", "task_list", taskListRule);
});

type Container = Extract<AstNode, { children: AstNode[] }>;

const container = <T extends Container["type"]>(
    type: T,
    data: Extract<Container, { type: T }>["data"],
): Container => ({ type, data, children: [] }) as unknown as Container;

const openers: Record<string, (token: Token) => Container | null> = {
    paragraph_open: (token) =>
        token.hidden ? null : container("paragraph", null),
    heading_open: (token) =>
        container("heading", { level: Number(token.tag.slice(1)) }),
    bullet_list_open: () => container("list", { type: "unordered" }),
    ordered_list_open: () => container("list", { type: "ordered" }),
    list_item_open: () => container("listItem", null),
    blockquote_open: () => container("blockQuote", null),
    table_open: () => container("table", null),
    thead_open: () => container("tableHead", null),
    tr_open: () => container("tableRow", null),
    th_open: () => container("tableCell", null),
    td_open: () => container("tableCell", null),
    footnote_open: (token) =>
        container("footnoteDefinition", { label: footnoteLabel(token) }),
    em_open: () => container("emphasis", null),
    strong_open: () => container("strong", null),
    s_open: () => container("strikethrough", null),
    link_open: (token) =>
        container("link", {
            url: attribute(token, "href"),
            title: attribute(token, "title"),
        }),
};

const meta = <T>(token: Token) => token.meta as unknown as T;

const attribute = (token: Token, name: string) =>
    String(token.attrGet(name) ?? "");

interface FootnoteMeta {
    id: number;
    label?: string;
}

const footnoteLabel = (token: Token): string => {
    const { id, label } = meta<FootnoteMeta>(token);
    return label ?? String(id + 1);
};

// Containers the original's token stream did not have. The head row inside
// thead is skipped as well, so head cells sit directly in tableHead and body
// rows directly in the table.
const transparent = new Set([
    "tbody_open",
    "tbody_close",
    "footnote_block_open",
    "footnote_block_close",
]);

const contentNode = (token: Token): AstNode | null => {
    switch (token.type) {
        case "text":
            return { type: "text", content: token.content };
        case "code_inline":
            return { type: "code", content: token.content };
        case "softbreak":
            return { type: "softBreak" };
        case "hardbreak":
            return { type: "hardBreak" };
        case "hr":
            return { type: "rule" };
        case "image":
            return {
                type: "image",
                url: attribute(token, "src"),
                title: token.content,
            };
        case "footnote_ref":
            return { type: "footnoteReference", label: footnoteLabel(token) };
        case "extension":
            return { type: "extension", ...meta<ExtensionMeta>(token) };
        case "task_list_marker":
            return {
                type: "taskListMarker",
                checked: meta<{ checked: boolean }>(token).checked,
            };
        case "fence":
        case "code_block":
            return {
                type: "codeBlock",
                data: { language: token.info.trim().split(/\s+/)[0] ?? "" },
                children: [{ type: "text", content: token.content }],
            };
    }
    return null;
};

const push = (parent: Container, node: AstNode) => {
    const last = parent.children[parent.children.length - 1];
    if (node.type === "text" && last?.type === "text") {
        last.content += node.content;
        return;
    }
    parent.children.push(node);
};

const build = (tokens: Token[], stack: (Container | null)[]) => {
    for (const token of tokens) {
        if (token.type === "inline") {
            build(token.children ?? [], stack);
            continue;
        }

        if (transparent.has(token.type)) {
            continue;
        }

        const parent = stack.filter((item) => item !== null).pop()!;

        if (token.nesting === 1) {
            const opener = openers[token.type];
            const isHeadRow =
                token.type === "tr_open" && parent.type === "tableHead";
            const node = !isHeadRow ? (opener?.(token) ?? null) : null;
            if (node) {
                push(parent, node);
            }
            stack.push(node);
            continue;
        }

        if (token.nesting === -1) {
            stack.pop();
            continue;
        }

        const node = contentNode(token);
        if (node) {
            push(parent, node);
        }
    }
};

// The same rule markdown images go through (no javascript: and the like).
export const isAllowedImageUrl = (url: string) =>
    parser.validateLink(url.trim());

export const tokenizeMarkdown = (markdownText: string): Token[] =>
    parser.parse(markdownText, {} satisfies ParseEnv);

export const parseMarkdown = (markdownText: string): RootAstNode => {
    const root: RootAstNode = { type: "root", data: null, children: [] };
    build(tokenizeMarkdown(markdownText), [root as Container]);
    return root;
};

export const nodeText = (node: AstNode): string => {
    if (node.type === "text" || node.type === "code") {
        return node.content;
    }
    return "children" in node ? node.children.map(nodeText).join("") : "";
};

// Prefixed so a heading cannot shadow an app element id (SF-31).
export const getHeadingId = (text: string) =>
    `note-h-${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
