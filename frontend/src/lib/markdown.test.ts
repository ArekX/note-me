import { describe, expect, it } from "vitest";
import { parseMarkdown, type AstNode } from "./markdown";
import { parseTableOfContents } from "./table-of-contents";

// Compact form of the tree: "type" for leaves, [type, ...children] for
// containers, with the fields that matter for each node.
const outline = (node: AstNode): unknown => {
    switch (node.type) {
        case "text":
        case "code":
            return `${node.type}:${node.content}`;
        case "image":
            return `image:${node.url}|${node.title}`;
        case "footnoteReference":
            return `ref:${node.label}`;
        case "extension":
            return `ext:${node.extension}(${node.params.join(",")})`;
        case "taskListMarker":
            return `task:${node.checked}`;
        case "softBreak":
        case "hardBreak":
        case "rule":
            return node.type;
    }

    const label =
        node.type === "list"
            ? `list:${node.data.type}`
            : node.type === "heading"
              ? `h${node.data.level}`
              : node.type === "link"
                ? `link:${node.data.url}|${node.data.title}`
                : node.type === "codeBlock"
                  ? `codeBlock:${node.data.language}`
                  : node.type === "footnoteDefinition"
                    ? `footnote:${node.data.label}`
                    : node.type;
    return [label, ...node.children.map(outline)];
};

const parse = (text: string) => parseMarkdown(text).children.map(outline);

// Expected trees follow the original's pulldown-cmark rendering of the same
// input.
describe("parseMarkdown", () => {
    it("parses headings, emphasis, breaks and inline code", () => {
        expect(parse("# Title `x`\n\n*a* **b** ~~c~~\nnext  \nhard")).toEqual([
            ["h1", "text:Title ", "code:x"],
            [
                "paragraph",
                ["emphasis", "text:a"],
                "text: ",
                ["strong", "text:b"],
                "text: ",
                ["strikethrough", "text:c"],
                "softBreak",
                "text:next",
                "hardBreak",
                "text:hard",
            ],
        ]);
    });

    it("parses tight lists with task markers and ordered lists", () => {
        expect(parse("- [ ] todo\n- [x] done\n- plain\n\n1. one")).toEqual([
            [
                "list:unordered",
                ["listItem", "task:false", "text:todo"],
                ["listItem", "task:true", "text:done"],
                ["listItem", "text:plain"],
            ],
            ["list:ordered", ["listItem", "text:one"]],
        ]);
    });

    it("keeps paragraphs in loose lists and quotes", () => {
        expect(parse("- a\n\n- b\n\n> quote")).toEqual([
            [
                "list:unordered",
                ["listItem", ["paragraph", "text:a"]],
                ["listItem", ["paragraph", "text:b"]],
            ],
            ["blockQuote", ["paragraph", "text:quote"]],
        ]);
    });

    it("puts head cells directly in tableHead and rows in the table", () => {
        expect(parse("| a | b |\n|---|---|\n| 1 | 2 |")).toEqual([
            [
                "table",
                ["tableHead", ["tableCell", "text:a"], ["tableCell", "text:b"]],
                ["tableRow", ["tableCell", "text:1"], ["tableCell", "text:2"]],
            ],
        ]);
    });

    it("parses code blocks, images, links and a rule", () => {
        expect(
            parse(
                '```go\nfunc() {}\n```\n\n![alt](/a.png) [x](http://e.com "t")\n\n---',
            ),
        ).toEqual([
            ["codeBlock:go", "text:func() {}\n"],
            [
                "paragraph",
                "image:/a.png|alt",
                "text: ",
                ["link:http://e.com|t", "text:x"],
            ],
            "rule",
        ]);
    });

    it("collects footnote definitions at the end", () => {
        expect(parse("A[^n] B.\n\n[^n]: Note.\n\nAfter.")).toEqual([
            ["paragraph", "text:A", "ref:n", "text: B."],
            ["paragraph", "text:After."],
            ["footnote:n", ["paragraph", "text:Note."]],
        ]);
    });

    it("keeps raw HTML as text and merges adjacent text", () => {
        expect(parse("a <b>c</b> \\*d\\*")).toEqual([
            ["paragraph", "text:a <b>c</b> *d*"],
        ]);
    });

    it("parses extensions, honours escapes and limits", () => {
        expect(
            parse("{:note-link|1|2} \\{:x} {:table-of-contents} `{:y}`"),
        ).toEqual([
            [
                "paragraph",
                "ext:note-link(1,2)",
                "text: {:x} ",
                "ext:table-of-contents()",
                "text: ",
                "code:{:y}",
            ],
        ]);

        const lists = parse("{:note-list|1}".repeat(101));
        expect((lists[0] as string[]).at(-1)).toBe(
            "ext:over-limit(note-list,101,100)",
        );
    });
});

describe("parseTableOfContents", () => {
    it("nests headings by level and includes inline code", () => {
        expect(parseTableOfContents("# A\n## B `c`\n### D\n## E\n# F")).toEqual(
            [
                {
                    level: 1,
                    text: "A",
                    children: [
                        {
                            level: 2,
                            text: "B c",
                            children: [{ level: 3, text: "D", children: [] }],
                        },
                        { level: 2, text: "E", children: [] },
                    ],
                },
                { level: 1, text: "F", children: [] },
            ],
        );
    });
});
