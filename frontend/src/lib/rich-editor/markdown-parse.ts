import type { JSONContent } from "@tiptap/core";
import type { Token } from "markdown-it";
import { tokenizeMarkdown } from "@/lib/markdown";

type Mark = NonNullable<JSONContent["marks"]>[number];

interface Block extends JSONContent {
    type: string;
    content: JSONContent[];
    task?: boolean | null;
}

const block = (type: string, attrs?: Record<string, unknown>): Block => ({
    type,
    ...(attrs ? { attrs } : {}),
    content: [],
});

const attribute = (token: Token, name: string) => {
    const value = token.attrGet(name);
    return value === null ? null : String(value);
};

const nearest = (stack: Block[], test: (entry: Block) => boolean) =>
    [...stack].reverse().find(test);

const cellAlign = (token: Token) =>
    /text-align:\s*(left|center|right)/.exec(
        attribute(token, "style") ?? "",
    )?.[1] ?? null;

interface FootnoteMeta {
    id: number;
    label?: string;
}

const footnoteLabel = (token: Token) => {
    const { id, label } = token.meta as unknown as FootnoteMeta;
    return label ?? String(id + 1);
};

const blockOpeners: Record<string, (token: Token) => Block> = {
    paragraph_open: () => block("paragraph"),
    heading_open: (token) =>
        block("heading", { level: Number(token.tag.slice(1)) }),
    blockquote_open: () => block("blockquote"),
    bullet_list_open: (token) =>
        block("bulletList", { markup: token.markup, tight: true }),
    ordered_list_open: (token) =>
        block("orderedList", {
            start: Number(attribute(token, "start") ?? 1),
            markup: token.markup,
            tight: true,
        }),
    list_item_open: () => block("listItem"),
    table_open: () => block("table"),
    tr_open: () => block("tableRow"),
    th_open: (token) => block("tableHeader", { align: cellAlign(token) }),
    td_open: (token) => block("tableCell", { align: cellAlign(token) }),
    footnote_open: (token) =>
        block("footnoteDefinition", { label: footnoteLabel(token) }),
};

const skipped = new Set([
    "thead_open",
    "thead_close",
    "tbody_open",
    "tbody_close",
    "footnote_block_open",
    "footnote_block_close",
    "footnote_anchor",
]);

const markOpeners: Record<string, (token: Token) => Mark> = {
    strong_open: (token) => ({ type: "bold", attrs: { markup: token.markup } }),
    em_open: (token) => ({ type: "italic", attrs: { markup: token.markup } }),
    s_open: () => ({ type: "strike" }),
    link_open: (token) => ({
        type: "link",
        attrs: {
            href: attribute(token, "href"),
            title: attribute(token, "title"),
        },
    }),
};

const withMarks = (node: JSONContent, marks: Mark[]): JSONContent =>
    marks.length > 0 ? { ...node, marks: [...marks] } : node;

const inlineNode = (token: Token, marks: Mark[]): JSONContent | null => {
    switch (token.type) {
        case "text":
            return token.content
                ? withMarks({ type: "text", text: token.content }, marks)
                : null;
        case "code_inline":
            return withMarks({ type: "text", text: token.content }, [
                ...marks,
                { type: "code" },
            ]);
        case "softbreak":
            return { type: "softBreak" };
        case "hardbreak":
            return { type: "hardBreak" };
        case "image":
            return withMarks(
                {
                    type: "image",
                    attrs: {
                        src: attribute(token, "src"),
                        alt: token.content,
                        title: attribute(token, "title"),
                    },
                },
                marks,
            );
        case "extension":
            return withMarks(
                { type: "noteExtension", attrs: { source: token.content } },
                marks,
            );
        case "footnote_ref":
            return {
                type: "footnoteReference",
                attrs: { label: footnoteLabel(token) },
            };
    }
    return null;
};

const codeBlock = (token: Token): JSONContent => {
    const text = token.content.replace(/\n$/, "");
    return {
        type: "codeBlock",
        attrs: {
            language: token.info.trim() || null,
            markup: token.type === "code_block" ? "indent" : token.markup,
        },
        ...(text ? { content: [{ type: "text", text }] } : {}),
    };
};

const parseInline = (tokens: Token[], parent: Block, stack: Block[]) => {
    const marks: Mark[] = [];
    for (const token of tokens) {
        const opener = markOpeners[token.type];
        if (opener) {
            marks.push(opener(token));
            continue;
        }
        if (token.nesting === -1) {
            marks.pop();
            continue;
        }
        if (token.type === "task_list_marker") {
            const item = nearest(stack, (entry) => entry.type === "listItem");
            if (item) {
                item.task = (token.meta as { checked: boolean }).checked;
            }
            continue;
        }
        const node = inlineNode(token, marks);
        if (node) {
            parent.content.push(node);
        }
    }
};

const taskText = (checked: boolean) => (checked ? "[x] " : "[ ] ");

// Tiptap task lists hold only task items, so a list with a plain item keeps
// its markers as text; the viewer still shows them as checkboxes.
const finishList = (list: Block) => {
    const items = list.content as Block[];
    const allTasks =
        list.type === "bulletList" && items.every((item) => item.task != null);
    for (const item of items) {
        if (item.task == null) {
            continue;
        }
        if (allTasks) {
            item.type = "taskItem";
            item.attrs = { checked: item.task };
        } else {
            const first = item.content[0] as Block;
            first.content.unshift({ type: "text", text: taskText(item.task) });
        }
        delete item.task;
    }
    if (allTasks) {
        list.type = "taskList";
        list.attrs = { markup: list.attrs?.markup, tight: list.attrs?.tight };
    }
};

// Fills in what the editor schema requires and markdown may leave out.
const finishBlock = (node: Block) => {
    switch (node.type) {
        case "listItem":
            if (node.content[0]?.type !== "paragraph") {
                node.content.unshift({ type: "paragraph" });
            }
            break;
        case "blockquote":
        case "footnoteDefinition":
            if (node.content.length === 0) {
                node.content.push({ type: "paragraph" });
            }
            break;
        case "bulletList":
        case "orderedList":
            finishList(node);
            break;
    }
};

export const markdownToDoc = (markdown: string): JSONContent => {
    const doc = block("doc");
    const stack: Block[] = [doc];
    const top = () => stack[stack.length - 1]!;

    for (const token of tokenizeMarkdown(markdown)) {
        if (skipped.has(token.type)) {
            continue;
        }
        if (token.type === "inline") {
            const parent = top();
            const target =
                parent.type === "tableCell" || parent.type === "tableHeader"
                    ? (parent.content[
                          parent.content.push(block("paragraph")) - 1
                      ] as Block)
                    : parent;
            parseInline(token.children ?? [], target, stack);
            continue;
        }
        // markdown-it hides the paragraphs of tight lists.
        if (
            token.type === "paragraph_open" &&
            !token.hidden &&
            top().type === "listItem"
        ) {
            const list = nearest(stack, (entry) => entry.type.endsWith("List"));
            list!.attrs!.tight = false;
        }

        const opener = blockOpeners[token.type];
        if (opener) {
            const node = opener(token);
            top().content.push(node);
            stack.push(node);
            continue;
        }
        if (token.nesting === -1) {
            finishBlock(stack.pop()!);
            continue;
        }
        if (token.type === "fence" || token.type === "code_block") {
            top().content.push(codeBlock(token));
        } else if (token.type === "hr") {
            top().content.push({
                type: "horizontalRule",
                attrs: { markup: token.markup },
            });
        }
    }
    if (doc.content.length === 0) {
        doc.content.push({ type: "paragraph" });
    }
    return doc;
};
