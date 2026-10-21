import type { JSONContent } from "@tiptap/core";

type Mark = NonNullable<JSONContent["marks"]>[number];

interface InlineContext {
    singleLine: boolean;
    inTable: boolean;
}

const children = (node: JSONContent) => node.content ?? [];

const markOrder = ["link", "bold", "italic", "strike"];

// Bold and italic marks differ only in the markup they were parsed from, so
// they count as one mark; links differ by target.
const sameMark = (a: Mark, b: Mark) =>
    a.type === b.type &&
    (a.type !== "link" ||
        (a.attrs?.href === b.attrs?.href && a.attrs?.title === b.attrs?.title));

const delimiter = (mark: Mark, fallback: string) =>
    (mark.attrs?.markup as string | null | undefined) || fallback;

const openMark = (mark: Mark) => {
    switch (mark.type) {
        case "bold":
            return delimiter(mark, "**");
        case "italic":
            return delimiter(mark, "*");
        case "strike":
            return "~~";
    }
    return "[";
};

const closeMark = (mark: Mark) =>
    mark.type === "link"
        ? `](${linkTarget(mark.attrs?.href ?? "", mark.attrs?.title)})`
        : openMark(mark);

const balancedParens = (text: string) => {
    let depth = 0;
    for (const char of text) {
        depth += char === "(" ? 1 : char === ")" ? -1 : 0;
        if (depth < 0) {
            return false;
        }
    }
    return depth === 0;
};

const linkTarget = (href: string, title?: string | null) => {
    const url =
        /[\s<>]/.test(href) || !balancedParens(href)
            ? `<${href.replace(/[<>]/g, (char) => (char === "<" ? "%3C" : "%3E"))}>`
            : href;
    return title ? `${url} "${title.replace(/["\\]/g, "\\$&")}"` : url;
};

const autolinkPattern = /^https?:\/\/[^\s<>]+$/i;

const escapeText = (text: string, context: InlineContext, inLink: boolean) => {
    let escaped = text
        .replace(/\\(?=[!-/:-@[-`{-~]|$)/g, "\\\\")
        .replace(/[`*[]/g, "\\$&")
        .replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "\\_")
        .replace(/~(?=~)|(?<=~)~/g, "\\~")
        .replace(/&(?=#?[a-z0-9]+;)/gi, "\\&")
        .replace(
            /<(?=[a-z][a-z0-9+.-]{1,31}:[^\s<>]*>|[^\s<>@]+@[^\s<>]+>)/gi,
            "\\<",
        )
        .replace(/\{(?=:[a-zA-Z0-9-]+(?:\|[^}\n]+)*\})/g, "\\{");
    if (inLink) {
        escaped = escaped.replace(/]/g, "\\]");
    }
    if (context.inTable) {
        escaped = escaped.replace(/\|/g, "\\|");
    }
    return escaped.replace(/[ \t]*\n\s*/g, context.singleLine ? " " : "\n");
};

const codeSpan = (text: string, context: InlineContext) => {
    let content = text.replace(/\n/g, " ");
    if (context.inTable) {
        content = content.replace(/\|/g, "\\|");
    }
    const longest = Math.max(
        0,
        ...(content.match(/`+/g) ?? []).map((run) => run.length),
    );
    const fence = "`".repeat(longest + 1);
    const pad =
        /^`|`$/.test(content) ||
        (/^ .* $/.test(content) && content.trim() !== "")
            ? " "
            : "";
    return `${fence}${pad}${content}${pad}${fence}`;
};

const escapeAlt = (text: string) => text.replace(/[\\[\]]/g, "\\$&");

const isAutolink = (node: JSONContent, link: Mark | undefined) =>
    link !== undefined &&
    !link.attrs?.title &&
    node.text === link.attrs?.href &&
    autolinkPattern.test(node.text ?? "");

const renderInline = (nodes: JSONContent[], context: InlineContext): string => {
    let out = "";
    const active: Mark[] = [];

    // Whitespace stays outside emphasis delimiters, or they stop counting.
    const closeTo = (count: number) => {
        while (active.length > count) {
            const mark = active.pop()!;
            if (mark.type === "link") {
                out += closeMark(mark);
                continue;
            }
            const trailing = /(?:\\\n|\s)*$/.exec(out)![0];
            out =
                out.slice(0, out.length - trailing.length) +
                closeMark(mark) +
                trailing;
        }
    };

    for (const node of nodes) {
        let marks = (node.marks ?? []).filter((mark) => mark.type !== "code");
        const link = marks.find((mark) => mark.type === "link");
        const autolink =
            node.type === "text" &&
            isAutolink(node, link) &&
            !active.some((mark) => mark.type === "link");
        if (autolink) {
            marks = marks.filter((mark) => mark !== link);
        }

        let keep = 0;
        while (
            keep < active.length &&
            marks.some((mark) => sameMark(mark, active[keep]!))
        ) {
            keep++;
        }
        closeTo(keep);

        const inLink = marks.some((mark) => mark.type === "link");
        let content = autolink
            ? `<${node.text}>`
            : renderInlineNode(node, context, inLink);
        const opening = marks
            .filter((mark) => !active.some((other) => sameMark(other, mark)))
            .sort(
                (a, b) => markOrder.indexOf(a.type) - markOrder.indexOf(b.type),
            );
        if (opening.length > 0) {
            const leading = /^\s*/.exec(content)![0];
            out += leading;
            content = content.slice(leading.length);
            for (const mark of opening) {
                // "!" before a link would turn it into an image.
                if (
                    mark.type === "link" &&
                    out.endsWith("!") &&
                    !out.endsWith("\\!")
                ) {
                    out = `${out.slice(0, -1)}\\!`;
                }
                out += openMark(mark);
                active.push(mark);
            }
        }
        out += content;
    }
    closeTo(0);
    return out;
};

const renderInlineNode = (
    node: JSONContent,
    context: InlineContext,
    inLink: boolean,
) => {
    switch (node.type) {
        case "text":
            return node.marks?.some((mark) => mark.type === "code")
                ? codeSpan(node.text ?? "", context)
                : escapeText(node.text ?? "", context, inLink);
        case "softBreak":
            return context.singleLine ? " " : "\n";
        case "hardBreak":
            return context.singleLine ? " " : "\\\n";
        case "image":
            return `![${escapeAlt(node.attrs?.alt ?? "")}](${linkTarget(
                node.attrs?.src ?? "",
                node.attrs?.title,
            )})`;
        case "noteExtension":
            return node.attrs?.source ?? "";
        case "footnoteReference":
            return `[^${node.attrs?.label}]`;
    }
    return "";
};

// Text that would start a block when it opens a line is escaped there.
const escapeLineStart = (line: string) =>
    line
        .trimStart()
        .replace(/^(#{1,6})(?=\s|$)/, "\\$1")
        .replace(/^(>|\+(?=\s|$))/, "\\$1")
        .replace(/^-(?=\s|$)/, "\\-")
        .replace(/^([-\s]+|=+\s*)$/, "\\$1")
        .replace(/^(\d{1,9})([.)])(?=\s|$)/, "$1\\$2");

const paragraphText = (node: JSONContent) =>
    renderInline(children(node), { singleLine: false, inTable: false })
        .split("\n")
        .map((line, index, lines) => {
            const escaped = escapeLineStart(line);
            return index < lines.length - 1
                ? escaped.replace(/[ \t]+$/, "")
                : escaped.trimEnd();
        })
        .join("\n");

const singleLine = (nodes: JSONContent[], inTable = false) =>
    renderInline(nodes, { singleLine: true, inTable }).trim();

const prefixLines = (text: string, first: string, rest: string) =>
    text
        .split("\n")
        .map((line, index) => {
            const prefix = index === 0 ? first : rest;
            return line ? prefix + line : prefix.trimEnd();
        })
        .join("\n");

const isList = (node: JSONContent | undefined) =>
    node?.type === "bulletList" ||
    node?.type === "orderedList" ||
    node?.type === "taskList";

// A tight list cannot hold two paragraphs (or other blocks) in one item;
// joined without a blank line they would merge.
const isTight = (list: JSONContent) =>
    list.attrs?.tight !== false &&
    children(list).every((item) =>
        children(item).every((child, index) => index === 0 || isList(child)),
    );

const renderList = (list: JSONContent, bullet: string | null) => {
    const tight = isTight(list);
    const start = Number(list.attrs?.start ?? 1);
    const items = children(list).map((item, index) => {
        let marker: string;
        let indent: number;
        if (list.type === "orderedList") {
            marker = `${start + index}${list.attrs?.markup || "."}`;
            indent = marker.length + 1;
        } else if (list.type === "taskList") {
            marker = `${bullet} [${item.attrs?.checked ? "x" : " "}]`;
            indent = 2;
        } else {
            marker = bullet!;
            indent = 2;
        }
        const content = renderBlocks(children(item), tight);
        return content
            ? prefixLines(content, `${marker} `, " ".repeat(indent))
            : marker;
    });
    return items.join(tight ? "\n" : "\n\n");
};

const fenceFor = (code: string, markup: string | null | undefined) => {
    const fence = markup && markup !== "indent" ? markup : "```";
    const char = fence[0]!;
    const runs = code.match(new RegExp(`^ {0,3}\\${char}+`, "gm")) ?? [];
    const longest = Math.max(0, ...runs.map((run) => run.trim().length));
    return longest >= fence.length ? char.repeat(longest + 1) : fence;
};

const renderCodeBlock = (node: JSONContent, afterList: boolean) => {
    const code = children(node)
        .map((child) => child.text ?? "")
        .join("");
    const language = (node.attrs?.language as string | null) ?? "";
    if (
        node.attrs?.markup === "indent" &&
        !language &&
        !afterList &&
        code.trim()
    ) {
        return prefixLines(code, "    ", "    ");
    }
    const fence = fenceFor(code, node.attrs?.markup);
    return `${fence}${language}\n${code ? `${code}\n` : ""}${fence}`;
};

const alignDelimiter = (align: unknown, width: number) => {
    const dashes = "-".repeat(Math.max(3, width));
    switch (align) {
        case "left":
            return `:${dashes.slice(1)}`;
        case "right":
            return `${dashes.slice(1)}:`;
        case "center":
            return `:${dashes.slice(2)}:`;
    }
    return dashes;
};

const renderTable = (table: JSONContent) => {
    const rows = children(table).map((row) =>
        children(row).map((cell) =>
            children(cell)
                .map((paragraph) => singleLine(children(paragraph), true))
                .filter(Boolean)
                .join(" "),
        ),
    );
    const firstRow = children(children(table)[0] ?? {});
    const columns = Math.max(0, ...rows.map((row) => row.length));
    if (columns === 0) {
        return "";
    }
    const widths = Array.from({ length: columns }, (_, column) =>
        Math.max(3, ...rows.map((row) => (row[column] ?? "").length)),
    );
    const line = (cells: string[]) =>
        `| ${widths.map((width, column) => (cells[column] ?? "").padEnd(width)).join(" | ")} |`;
    const [header = [], ...body] = rows;
    return [
        line(header),
        line(
            widths.map((width, column) =>
                alignDelimiter(firstRow[column]?.attrs?.align, width),
            ),
        ),
        ...body.map(line),
    ].join("\n");
};

const otherMarker: Record<string, string> = {
    "-": "*",
    "*": "-",
    "+": "-",
    ".": ")",
    ")": ".",
};

// Two lists of the same kind next to each other would merge into one, so
// the second one switches its marker.
const renderBlocks = (nodes: JSONContent[], tight = false): string => {
    const parts: string[] = [];
    let previous: JSONContent | undefined;
    let previousMarker: string | null = null;
    for (const node of nodes) {
        let rendered: string;
        if (isList(node)) {
            const ordered = node.type === "orderedList";
            let marker =
                (node.attrs?.markup as string | null) || (ordered ? "." : "-");
            if (
                isList(previous) &&
                (previous!.type === "orderedList") === ordered &&
                previousMarker === marker
            ) {
                marker = otherMarker[marker]!;
            }
            rendered = ordered
                ? renderList(
                      { ...node, attrs: { ...node.attrs, markup: marker } },
                      null,
                  )
                : renderList(node, marker);
            previousMarker = marker;
        } else {
            rendered = renderBlock(node, isList(previous));
        }
        previous = node;
        if (rendered) {
            parts.push(rendered);
        }
    }
    return parts.join(tight ? "\n" : "\n\n");
};

const renderBlock = (node: JSONContent, afterList: boolean): string => {
    switch (node.type) {
        case "paragraph":
            return paragraphText(node);
        case "heading": {
            const text = singleLine(children(node)).replace(
                /(\s)(#+)$/,
                "$1\\$2",
            );
            return `${"#".repeat(node.attrs?.level ?? 1)} ${text}`.trimEnd();
        }
        case "blockquote":
            return prefixLines(renderBlocks(children(node)), "> ", "> ");
        case "codeBlock":
            return renderCodeBlock(node, afterList);
        case "horizontalRule":
            return (node.attrs?.markup as string | null) || "---";
        case "table":
            return renderTable(node);
        case "footnoteDefinition":
            return prefixLines(
                renderBlocks(children(node)),
                `[^${node.attrs?.label}]: `,
                "    ",
            );
    }
    return renderBlocks(children(node));
};

export const docToMarkdown = (doc: JSONContent): string =>
    renderBlocks(children(doc));
