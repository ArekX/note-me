import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { parseMarkdown } from "@/lib/markdown";
import { createRichEditorExtensions } from "./extensions";
import { markdownToDoc } from "./markdown-parse";
import { docToMarkdown } from "./markdown-serialize";

let editor: Editor | null = null;

afterEach(() => {
    editor?.destroy();
    editor = null;
});

const open = (markdown = "") => {
    editor = new Editor({
        extensions: createRichEditorExtensions(),
        content: markdownToDoc(markdown),
    });
    return editor;
};

const roundTrip = (markdown: string) => docToMarkdown(open(markdown).getJSON());

// What the browser does for a key press: input rules first, then the text.
const type = (target: Editor, text: string) => {
    const { view } = target;
    for (const char of text) {
        const { from, to } = view.state.selection;
        const insert = () => view.state.tr.insertText(char, from, to);
        const handled = view.someProp("handleTextInput", (handler) =>
            handler(view, from, to, char, insert),
        );
        if (!handled) {
            view.dispatch(insert());
        }
    }
};

describe("rich editor markdown", () => {
    it.each([
        ["heading", "## Title"],
        ["emphasis", "Some **bold**, *italic*, ~~strike~~ and `code`."],
        ["underscore emphasis", "Some __strong__ and _em_ text."],
        ["nested marks", "***both*** and **bold *inner* bold**"],
        ["link", '[text](https://example.com "Title") and <https://auto.link>'],
        ["image", "![A cat](/file/abc) in a line"],
        ["tight list", "- one\n- two\n  - nested\n- three"],
        ["star list", "* one\n* two"],
        ["ordered list", "3. three\n4. four"],
        ["paren list", "1) one\n2) two"],
        ["loose list", "1. one\n\n2. two"],
        ["list item paragraphs", "- item\n\n  second paragraph"],
        ["task list", "- [ ] todo\n- [x] done"],
        ["mixed task list", "- \\[ ] todo\n- plain"],
        ["blockquote", "> quote\n> more\n>\n> - list"],
        ["rules", "---\n\n***"],
        ["table", "| A   | B   |\n| :-- | --: |\n| 1   | 2   |"],
        [
            "table escapes",
            "| Code   | Text   |\n| ------ | ------ |\n| `x\\|y` | a \\| b |",
        ],
        [
            "footnotes",
            "Text[^1] and[^note].\n\n[^1]: First.\n\n[^note]: Second.\n\n    More.",
        ],
        ["fenced code", "```js\nconst a = `x`;\n```"],
        ["tilde fence", "~~~\ncode\n~~~"],
        ["fence around backticks", "````\n```\ninner\n```\n````"],
        ["indented code", "    indented code"],
        ["mermaid", "```mermaid\ngraph TD; A-->B\n```"],
        [
            "extensions",
            "{:note-list|5} and {:note-link|3}\n\n{:table-of-contents}",
        ],
        ["soft break", "Line one\nLine two"],
        ["hard break", "Line one\\\nLine two"],
        [
            "escapes",
            "\\*not italic\\* 2 \\* 3 a_b_c \\_x \\{:not-ext} C:\\Users",
        ],
        [
            "line starts",
            "\\# not a heading\n\\> not a quote\n\\- not a list\n1\\. not a list",
        ],
        ["raw html", "Raw <b>html</b> and <div>block</div>"],
        ["entities", "\\&copy; is not ©"],
    ])("keeps %s unchanged", (_, markdown) => {
        expect(roundTrip(markdown)).toBe(markdown);
    });

    it.each([
        ["hard break with spaces", "a  \nb", "a\\\nb"],
        ["setext heading", "Title\n=====", "# Title"],
        ["closing hashes", "# Title #", "# Title"],
        ["entity", "&copy; &amp;", "© &"],
        ["trailing spaces", "text   ", "text"],
        [
            "footnote moves to the end",
            "[^1]: Note.\n\nText[^1]",
            "Text[^1]\n\n[^1]: Note.",
        ],
    ])("normalises %s", (_, markdown, expected) => {
        expect(roundTrip(markdown)).toBe(expected);
    });

    const sample = [
        "# Note",
        'Some **bold** text with a [link](/b) and ![img](/file/x "T").',
        "- [ ] task\n- [x] done",
        "- \\[ ] mixed\n- plain",
        "1. one\n2. two\n   - nested **bold**",
        "> quote with `code`\n> and *more*",
        "| A | B |\n| - | - |\n| [a](/b) | `c` |",
        "Text[^1] and {:note-list|2}\n\n[^1]: Footnote with **bold**.",
        "```mermaid\ngraph TD; A-->B\n```",
        "    indented",
        "Escaped \\*x\\* and a_b and \\[y] and &amp; and <https://a.b>",
        "Hard  \nbreak and soft\nbreak",
        "Tabs\tand    spaces",
    ].join("\n\n");

    it("keeps the meaning the viewer shows", () => {
        expect(parseMarkdown(roundTrip(sample))).toEqual(parseMarkdown(sample));
    });

    it("is stable after the first save", () => {
        const once = roundTrip(sample);
        expect(roundTrip(once)).toBe(once);
    });

    it("keeps adjacent lists apart", () => {
        const target = open("- a");
        target.commands.setContent({
            type: "doc",
            content: [
                markdownToDoc("- a").content![0]!,
                markdownToDoc("- b").content![0]!,
                markdownToDoc("1. c").content![0]!,
                markdownToDoc("1. d").content![0]!,
            ],
        });
        const markdown = docToMarkdown(target.getJSON());
        expect(markdown).toBe("- a\n\n* b\n\n1. c\n\n1) d");
        expect(parseMarkdown(markdown).children).toHaveLength(4);
    });

    it("keeps whitespace outside emphasis", () => {
        const target = open("");
        target.commands.setContent({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "a" },
                        {
                            type: "text",
                            text: " bold ",
                            marks: [{ type: "bold" }],
                        },
                        { type: "text", text: "b" },
                    ],
                },
            ],
        });
        expect(docToMarkdown(target.getJSON())).toBe("a **bold** b");
    });

    it("closes emphasis before a hard break", () => {
        const target = open("");
        target.commands.setContent({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "a", marks: [{ type: "bold" }] },
                        { type: "hardBreak", marks: [{ type: "bold" }] },
                        { type: "text", text: "b" },
                    ],
                },
            ],
        });
        expect(docToMarkdown(target.getJSON())).toBe("**a**\\\nb");
    });

    it("escapes an exclamation mark before a link", () => {
        const target = open("");
        target.commands.setContent({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "Wow!" },
                        {
                            type: "text",
                            text: "link",
                            marks: [{ type: "link", attrs: { href: "/a" } }],
                        },
                    ],
                },
            ],
        });
        expect(docToMarkdown(target.getJSON())).toBe("Wow\\![link](/a)");
    });

    it("writes link targets that need brackets", () => {
        expect(roundTrip("[a](<my file.pdf>)")).toBe("[a](my%20file.pdf)");
        expect(roundTrip("[a](https://w.org/A_(b))")).toBe(
            "[a](https://w.org/A_(b))",
        );
    });
});

describe("rich editor input rules", () => {
    it.each([
        ["# ", "heading"],
        ["> ", "blockquote"],
        ["- ", "bulletList"],
        ["1. ", "orderedList"],
        ["``` ", "codeBlock"],
    ])("turns %s into a %s", (input, nodeType) => {
        const target = open("");
        type(target, `${input}text`);
        expect(target.getJSON().content![0]!.type).toBe(nodeType);
    });

    it.each([
        ["**bold** ", "**bold** "],
        ["*italic* ", "*italic* "],
        ["~~gone~~ ", "~~gone~~ "],
        ["`code` ", "`code` "],
        ["[text](/a) ", "[text](/a) "],
        ["![alt](/file/x) ", "![alt](/file/x) "],
        ["see {:note-link|4} ", "see {:note-link|4} "],
        ["text[^1] ", "text[^1] "],
    ])("formats %s in place", (input, expected) => {
        const target = open("");
        type(target, input);
        const paragraph = target.getJSON().content![0]!;
        expect(
            paragraph.content!.some(
                (node) => node.marks || node.type !== "text",
            ),
        ).toBe(true);
        expect(`${docToMarkdown(target.getJSON())} `).toBe(expected);
    });

    it("opens a footnote definition", () => {
        const target = open("");
        type(target, "[^1]: The note");
        expect(target.getJSON().content![0]!.type).toBe("footnoteDefinition");
        expect(docToMarkdown(target.getJSON())).toBe("[^1]: The note");
    });

    it("turns [ ] into a task list", () => {
        const target = open("");
        type(target, "- [ ] todo");
        expect(docToMarkdown(target.getJSON())).toBe("- [ ] todo");
    });
});

describe("rich editor shortcuts", () => {
    const press = (target: Editor, key: string) => {
        const { view } = target;
        const event = new KeyboardEvent("keydown", { key, ctrlKey: true });
        return view.someProp("handleKeyDown", (handler) =>
            handler(view, event),
        );
    };

    it("uses the source editor's shortcuts", () => {
        const openLink = vi.fn();
        editor = new Editor({
            extensions: createRichEditorExtensions({
                shortcuts: { openLink, openImage: vi.fn() },
            }),
            content: markdownToDoc("text"),
        });
        editor.commands.selectAll();
        press(editor, "b");
        expect(docToMarkdown(editor.getJSON())).toBe("**text**");

        press(editor, "k");
        expect(openLink).toHaveBeenCalledOnce();
    });

    it("leaves Ctrl+E to the preview switch", () => {
        const target = open("text");
        target.commands.selectAll();
        expect(press(target, "e")).toBe(true);
        expect(docToMarkdown(target.getJSON())).toBe("text");
    });
});
