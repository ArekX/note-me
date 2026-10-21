import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { continueListCommand, listAwareTabCommand } from "./list-continuation";
import {
    indentLeft,
    insertCodeBlock,
    insertImageCommand,
    insertLinkCommand,
    setHeading,
    toggleBold,
    toggleInlineCode,
    toggleLinePrefix,
} from "./markdown-commands";

const editor = (doc: string, from = doc.length, to = from) =>
    new EditorView({
        state: EditorState.create({
            doc,
            selection: EditorSelection.range(from, to),
        }),
    });

const run = (
    command: (view: EditorView) => boolean,
    doc: string,
    from?: number,
    to?: number,
) => {
    const view = editor(doc, from, to);
    const handled = command(view);
    return {
        handled,
        doc: view.state.doc.toString(),
        cursor: view.state.selection.main.head,
    };
};

describe("list continuation", () => {
    it("continues bullets, numbers and task items", () => {
        expect(run(continueListCommand, "- a").doc).toBe("- a\n- ");
        expect(run(continueListCommand, "  9. a").doc).toBe("  9. a\n  10. ");
        expect(run(continueListCommand, "* [x] done").doc).toBe(
            "* [x] done\n* [ ] ",
        );
    });

    it("ends the list on an empty item and ignores other lines", () => {
        expect(run(continueListCommand, "a\n- ").doc).toBe("a\n");
        expect(run(continueListCommand, "plain").handled).toBe(false);
    });

    it("indents list lines from the start and inserts spaces elsewhere", () => {
        expect(run(listAwareTabCommand, "- a", 3).doc).toBe("    - a");
        expect(run(listAwareTabCommand, "ab", 1).doc).toBe("a    b");
    });
});

describe("markdown commands", () => {
    it("wraps the selection in bold", () => {
        expect(run(toggleBold, "a word", 2, 6).doc).toBe("a **word**");
    });

    it("inserts link and image placeholders and selects the one to edit", () => {
        const selection = (view: EditorView) =>
            view.state.sliceDoc(
                view.state.selection.main.from,
                view.state.selection.main.to,
            );
        const check = (
            command: (view: EditorView) => boolean,
            doc: string,
            from: number,
            to: number,
        ) => {
            const view = editor(doc, from, to);
            command(view);
            return {
                doc: view.state.doc.toString(),
                selected: selection(view),
            };
        };

        expect(check(insertLinkCommand, "", 0, 0)).toEqual({
            doc: "[Link text](https://)",
            selected: "Link text",
        });
        expect(check(insertLinkCommand, "see label", 4, 9)).toEqual({
            doc: "see [label](https://)",
            selected: "https://",
        });
        expect(check(insertLinkCommand, "https://e.com", 0, 13)).toEqual({
            doc: "[Link text](https://e.com)",
            selected: "Link text",
        });
        expect(check(insertImageCommand, "", 0, 0)).toEqual({
            doc: "![Image description](https://)",
            selected: "Image description",
        });
        expect(check(insertImageCommand, "a cat", 0, 5)).toEqual({
            doc: "![a cat](https://)",
            selected: "https://",
        });
    });

    it("sets, changes and removes the heading level of selected lines", () => {
        const h2 = (view: EditorView) => setHeading(view, 2);
        expect(run(h2, "title", 0).doc).toBe("## title");
        expect(run(h2, "# title", 3).doc).toBe("## title");
        expect(run(h2, "## title", 3).doc).toBe("title");
        expect(run(h2, "a\n### b", 0, 7).doc).toBe("## a\n## b");
        expect(run((view) => setHeading(view, 6), "x").doc).toBe("###### x");
    });

    it("removes up to four leading spaces", () => {
        expect(run(indentLeft, "      a", 7).doc).toBe("  a");
    });
});

describe("toolbar commands", () => {
    it("wraps the selection in inline code", () => {
        expect(run(toggleInlineCode, "say hi", 4, 6).doc).toBe("say `hi`");
    });

    it("adds and removes a line prefix on every selected line", () => {
        const prefix = (view: EditorView) => toggleLinePrefix(view, "- ");
        expect(run(prefix, "a\nb", 0, 3).doc).toBe("- a\n- b");
        expect(run(prefix, "- a\n- b", 0, 7).doc).toBe("a\nb");
        expect(run(prefix, "- a\nb", 0, 5).doc).toBe("- - a\n- b");
        expect(run(prefix, "title").doc).toBe("- title");
    });
});

describe("insertCodeBlock", () => {
    it("opens an empty block with the cursor inside", () => {
        expect(run(insertCodeBlock, "")).toEqual({
            handled: true,
            doc: "```\n\n```",
            cursor: 4,
        });
    });

    it("starts on a new line and fences the selection", () => {
        expect(run(insertCodeBlock, "see let a;", 4, 10).doc).toBe(
            "see \n```\nlet a;\n```",
        );
    });
});
