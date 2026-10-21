interface ElementNode {
    tag: string;
    children: HtmlNode[];
}

type HtmlNode = ElementNode | string;

const VOID_TAGS = new Set([
    "area",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
]);

const SKIPPED_TAGS = new Set(["script", "style", "template", "button"]);

const BLOCK_TAGS = new Set([
    "blockquote",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "ul",
]);

const ENTITIES: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
};

const decodeEntities = (text: string) =>
    text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
        if (entity.startsWith("#")) {
            const isHex = entity[1]?.toLowerCase() === "x";
            const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
            return Number.isNaN(code) ? match : String.fromCodePoint(code);
        }
        return ENTITIES[entity.toLowerCase()] ?? match;
    });

const TOKEN =
    /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s/>=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;

export const parseHtml = (html: string): ElementNode => {
    const root: ElementNode = { tag: "#root", children: [] };
    const stack: ElementNode[] = [root];
    let skipDepth = 0;
    let position = 0;

    const addText = (text: string) => {
        if (text && skipDepth === 0) {
            stack.at(-1)!.children.push(decodeEntities(text));
        }
    };

    for (const match of html.matchAll(TOKEN)) {
        addText(html.slice(position, match.index));
        position = match.index + match[0].length;
        const [, closing, opening, , selfClosing] = match;
        if (closing) {
            const tag = closing.toLowerCase();
            if (SKIPPED_TAGS.has(tag)) {
                skipDepth = Math.max(0, skipDepth - 1);
                continue;
            }
            const index = stack.map((node) => node.tag).lastIndexOf(tag);
            if (index > 0) {
                stack.length = index;
            }
        } else if (opening) {
            const tag = opening.toLowerCase();
            if (SKIPPED_TAGS.has(tag)) {
                skipDepth += selfClosing ? 0 : 1;
                continue;
            }
            if (skipDepth > 0) {
                continue;
            }
            const node: ElementNode = { tag, children: [] };
            stack.at(-1)!.children.push(node);
            if (!selfClosing && !VOID_TAGS.has(tag)) {
                stack.push(node);
            }
        }
    }
    addText(html.slice(position));
    return root;
};

const textOf = (node: HtmlNode): string =>
    typeof node === "string" ? node : node.children.map(textOf).join("");

const isBlock = (node: HtmlNode) =>
    typeof node !== "string" && BLOCK_TAGS.has(node.tag);

const containsBlock = (node: ElementNode): boolean =>
    node.children.some(
        (child) =>
            typeof child !== "string" &&
            (isBlock(child) ||
                (child.tag === "pre" && textOf(child).includes("\n")) ||
                containsBlock(child)),
    );

const longestBacktickRun = (text: string) =>
    Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));

const inlineCode = (text: string) => {
    const fence = "`".repeat(longestBacktickRun(text) + 1);
    const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
    return `${fence}${padding}${text}${padding}${fence}`;
};

const codeBlock = (text: string) => {
    const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
    return `${fence}\n${text.replace(/^\n/, "").replace(/\s+$/, "")}\n${fence}`;
};

const wrap = (marker: string, text: string) => {
    const [, before, content, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
    return content ? `${before}${marker}${content}${marker}${after}` : text;
};

const indent = (text: string, prefix: string) =>
    text.replace(/\n(?=.)/g, `\n${prefix}`);

class Renderer {
    private seenHeading = false;
    private inCell = false;

    render(root: ElementNode) {
        return this.blocks(root.children).join("\n\n");
    }

    private inline(nodes: HtmlNode[]): string {
        return nodes
            .map((node) => {
                if (typeof node === "string") {
                    return node.replace(/\s+/g, " ");
                }
                switch (node.tag) {
                    case "br":
                        return "\n";
                    case "strong":
                    case "b":
                        return wrap("**", this.inline(node.children));
                    case "em":
                    case "i":
                        return wrap("*", this.inline(node.children));
                    case "code":
                    case "kbd":
                    case "pre":
                        return inlineCode(textOf(node).trim());
                    case "img":
                        return "";
                    default:
                        return this.inline(node.children);
                }
            })
            .join("");
    }

    private paragraph(nodes: HtmlNode[]) {
        return this.inline(nodes)
            .split("\n")
            .map((line) => line.replace(/ {2,}/g, " ").trim())
            .filter(Boolean)
            .join("\n");
    }

    private blocks(nodes: HtmlNode[]): string[] {
        const blocks: string[] = [];
        let pending: HtmlNode[] = [];
        const flush = () => {
            const text = this.paragraph(pending);
            if (text) {
                blocks.push(text);
            }
            pending = [];
        };

        // A one-line <pre> among text or in a table cell reads as inline code.
        const hasInline = nodes.some((node) =>
            typeof node === "string"
                ? node.trim() !== ""
                : !isBlock(node) && !containsBlock(node),
        );
        for (const node of nodes) {
            const isInlinePre =
                typeof node !== "string" &&
                node.tag === "pre" &&
                (hasInline || this.inCell) &&
                !textOf(node).includes("\n");
            if (
                typeof node !== "string" &&
                (isBlock(node) || containsBlock(node)) &&
                !isInlinePre
            ) {
                flush();
                blocks.push(...this.block(node));
            } else {
                pending.push(node);
            }
        }
        flush();
        return blocks;
    }

    private block(node: ElementNode): string[] {
        const heading = /^h([1-6])$/.exec(node.tag);
        if (heading) {
            const text = this.paragraph(node.children).replace(/\n/g, " ");
            if (!text) {
                return [];
            }
            // The first heading is the page title; help pages use h1 and h2
            // interchangeably for their sections.
            const level = this.seenHeading
                ? Math.max(2, Number(heading[1]))
                : 1;
            this.seenHeading = true;
            return [`${"#".repeat(level)} ${text}`];
        }
        switch (node.tag) {
            case "pre":
                return [codeBlock(textOf(node))];
            case "hr":
                return ["---"];
            case "ul":
            case "ol":
                return [this.list(node)].filter(Boolean);
            case "blockquote":
                return this.blocks(node.children).map(
                    (block) => `> ${block.replace(/\n/g, "\n> ")}`,
                );
            case "table":
                return [this.table(node)].filter(Boolean);
            default:
                return this.blocks(node.children);
        }
    }

    private list(node: ElementNode) {
        const items = node.children.filter(
            (child): child is ElementNode =>
                typeof child !== "string" && child.tag === "li",
        );
        return items
            .map((item, index) => {
                const marker = node.tag === "ol" ? `${index + 1}. ` : "- ";
                const content = this.blocks(item.children).join("\n");
                return `${marker}${indent(content, " ".repeat(marker.length))}`;
            })
            .join("\n");
    }

    private table(node: ElementNode) {
        const rows: ElementNode[] = [];
        const collect = (parent: ElementNode) => {
            for (const child of parent.children) {
                if (typeof child === "string") {
                    continue;
                }
                if (child.tag === "tr") {
                    rows.push(child);
                } else {
                    collect(child);
                }
            }
        };
        collect(node);

        const cellsOf = (row: ElementNode) =>
            row.children.filter(
                (child): child is ElementNode =>
                    typeof child !== "string" &&
                    (child.tag === "td" || child.tag === "th"),
            );
        const header =
            rows[0] && cellsOf(rows[0]).every((cell) => cell.tag === "th")
                ? cellsOf(rows.shift()!).map((cell) =>
                      this.paragraph(cell.children).replace(/\n/g, " "),
                  )
                : [];
        this.inCell = true;
        const body = rows.map((row) =>
            cellsOf(row).map((cell) => this.blocks(cell.children).join("\n\n")),
        );
        this.inCell = false;
        if (body.length === 0) {
            return "";
        }

        if (body.flat().some((cell) => cell.includes("\n"))) {
            return body
                .map((cells) => {
                    const lines = cells.map((cell, index) => {
                        const label = header[index];
                        if (!label) {
                            return cell;
                        }
                        return cell.includes("\n")
                            ? `${label}:\n\n${cell}`
                            : `${label}: ${cell}`;
                    });
                    return `- ${indent(lines.join("\n"), "  ")}`;
                })
                .join("\n\n");
        }

        const columns = Math.max(header.length, ...body.map((r) => r.length));
        const line = (cells: string[]) =>
            `| ${Array.from({ length: columns }, (_, i) =>
                (cells[i] ?? "").replace(/\|/g, "\\|"),
            ).join(" | ")} |`;
        return [
            line(header),
            `|${" --- |".repeat(columns)}`,
            ...body.map(line),
        ].join("\n");
    }
}

export const htmlToMarkdown = (html: string) =>
    `${new Renderer().render(parseHtml(html)).trim()}\n`;
